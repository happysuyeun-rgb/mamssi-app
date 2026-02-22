import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@components/Layout';
import PageHeader from '@components/PageHeader';
import { useAuth } from '@hooks/useAuth';
import { useEmotions } from '@hooks/useEmotions';
import { useHomeData } from '@hooks/useHomeData';
import { useNotify } from '@providers/NotifyProvider';
import { useActionGuard } from '@hooks/useActionGuard';
import { uploadEmotionImage, deleteEmotionImage } from '@utils/imageUpload';
import { supabase } from '@lib/supabaseClient';
import { updateFlowerGrowth } from '@services/flowers';
import { trackEvent } from '@lib/analytics';
import '@styles/record.css';
import { EMOTION_OPTIONS, type EmotionOption } from '@constants/emotions';
import { createNotification } from '@services/notifications';

type PhotoItem = { id: string; file: File | null; url: string };

const CATEGORIES = [
  { id: 'daily', emoji: '🏡', label: '일상' },
  { id: 'worry', emoji: '💭', label: '고민' },
  { id: 'love', emoji: '💕', label: '연애' },
  { id: 'work', emoji: '💼', label: '회사' },
  { id: 'humor', emoji: '😆', label: '유머' },
  { id: 'growth', emoji: '🌱', label: '성장' },
  { id: 'selfcare', emoji: '🧘‍♀️', label: '자기돌봄' },
] as const;

export default function Record() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useNotify();
  const { requireAuthForAction } = useActionGuard();
  const {
    emotions,
    addEmotion,
    updateEmotion,
    fetchEmotions,
    checkTodayPrivateEmotion,
    getEmotionById,
  } = useEmotions({
    userId: user?.id || null,
  });
  const { refetch: refetchHomeData } = useHomeData(user?.id || null);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const [searchParams] = useSearchParams();
  const editingRecordId = searchParams.get('id');
  const isEditing = Boolean(editingRecordId);
  const todayText = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [selectedEmotion, setSelectedEmotion] = useState<EmotionOption | null>(null);
  const [note, setNote] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [recordDate, setRecordDate] = useState(todayText);

  useEffect(() => {
    if (!isPublic) {
      setSelectedCategories([]);
    }
  }, [isPublic]);

  function onSelectEmotion(option: EmotionOption) {
    setSelectedEmotion(option);
  }

  function onPhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const MAX_PHOTOS = 2; // 최대 이미지 개수 제한

    // 현재 이미지 개수 확인
    const currentPhotoCount = photos.length;

    // 이미 2개가 있으면 추가 불가
    if (currentPhotoCount >= MAX_PHOTOS) {
      notify.warning('이미지는 최대 2개까지 첨부할 수 있어요', '⚠️');
      e.currentTarget.value = '';
      return;
    }

    const next: PhotoItem[] = [];
    const remainingSlots = MAX_PHOTOS - currentPhotoCount; // 남은 슬롯 개수

    files.forEach((file, index) => {
      // 남은 슬롯 개수만큼만 추가
      if (next.length >= remainingSlots) {
        if (index === remainingSlots) {
          notify.warning(
            `이미지는 최대 ${MAX_PHOTOS}개까지 첨부할 수 있어요. ${remainingSlots}개만 추가되었어요.`,
            '⚠️'
          );
        }
        return;
      }

      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        notify.warning('10MB 이하의 이미지만 첨부할 수 있어요', '⚠️');
        return;
      }
      const url = URL.createObjectURL(file);
      next.push({ id: `${file.name}-${file.size}-${Date.now()}`, file, url });
    });

    if (next.length) {
      setPhotos((prev) => [...prev, ...next]);
    }
    e.currentTarget.value = '';
  }

  function onRemovePhoto(id: string) {
    setPhotos((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found?.file) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.file) URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카테고리 단일 선택 토글
  function onToggleCategory(catId: string) {
    setSelectedCategories((prev) => (prev[0] === catId ? [] : [catId]));
  }

  function onTogglePublic(checked: boolean) {
    setIsPublic(checked);
    if (user?.id) {
      createNotification(user.id, 'record_visibility_changed', { isPublic: checked }).catch(
        () => {}
      );
    }
  }

  // 수정 모드: 기존 기록 불러오기 (Supabase 단건 조회)
  useEffect(() => {
    if (!isEditing || !editingRecordId || !user) return;

    console.log('[Record] 수정 모드 진입:', { editingRecordId, userId: user.id });

    // Supabase에서 직접 조회
    getEmotionById(editingRecordId)
      .then((existing) => {
        if (!existing) {
          console.error('[Record] 기록을 찾을 수 없음:', { editingRecordId, userId: user.id });
          notify.warning('수정할 기록을 찾을 수 없어요', '⚠️');
          goBack();
          return;
        }

        console.log('[Record] 기록 조회 성공:', {
          id: existing.id,
          mainEmotion: existing.main_emotion,
          content: existing.content?.substring(0, 20) + '...',
        });

        // DB 스키마: main_emotion (기존 emotion_type)
        const emotionOpt = EMOTION_OPTIONS.find((opt) => opt.label === existing.main_emotion);
        setSelectedEmotion(emotionOpt ?? null);
        // DB 스키마: content (최근 추가)
        setNote(existing.content);
        setIsPublic(existing.is_public ?? false);
        // category는 영문키로 저장되므로 그대로 사용
        setSelectedCategories(existing.category ? [existing.category] : []);
        // emotion_date가 있으면 사용, 없으면 created_at에서 추출
        const recordDate =
          existing.emotion_date || new Date(existing.created_at).toISOString().split('T')[0];
        setRecordDate(recordDate);
        // image_url 처리
        if (existing.image_url) {
          setPhotos([{ id: 'existing', file: null, url: existing.image_url }]);
        } else {
          setPhotos([]);
        }
      })
      .catch((err) => {
        console.error('[Record] 기록 조회 중 오류:', {
          editingRecordId,
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        notify.error('기록을 불러오는 중 오류가 발생했어요', '❌');
        goBack();
      });
  }, [editingRecordId, isEditing, goBack, user, getEmotionById, notify]);

  const showCategorySection = isPublic;
  const meetsBaseConditions = Boolean(selectedEmotion && note.trim().length >= 5);
  const meetsPublicConditions = !isPublic || selectedCategories.length > 0;
  const isSaveEnabled = meetsBaseConditions && meetsPublicConditions;
  const isSharedToForest = isPublic && selectedCategories.length > 0;

  async function onSave() {
    if (!isSaveEnabled || !selectedEmotion) return;

    // 쓰기 액션 권한 체크 (게스트면 로그인 유도 모달 표시)
    requireAuthForAction(
      'save_record',
      async () => {
        if (!user) return;

        // 나만 보기 기록은 하루에 한 번만 작성 가능 (서버 쿼리로 체크)
        if (!isPublic && !isEditing) {
          const todayDate = new Date(recordDate).toISOString().split('T')[0];
          const hasTodayPrivate = await checkTodayPrivateEmotion(todayDate);
          if (hasTodayPrivate) {
            notify.warning('나만 보기 기록은 하루에 한 번만 작성할 수 있어요', '⚠️');
            setIsSaving(false);
            setIsUploadingImage(false);
            return;
          }
        }

        setIsSaving(true);
        setIsUploadingImage(photos.some((p) => p.file !== null));

        try {
          let imageUrl: string | null = null;

          // 새로 업로드할 이미지가 있으면 업로드
          const photoToUpload = photos.find((p) => p.file !== null);
          if (photoToUpload?.file) {
            console.log('[Record] 이미지 업로드 시작:', {
              fileName: photoToUpload.file.name,
              fileSize: photoToUpload.file.size,
              userId: user.id,
            });

            const uploadResult = await uploadEmotionImage(photoToUpload.file, user.id);

            if (uploadResult.error) {
              console.error('[Record] 이미지 업로드 실패:', {
                error: uploadResult.error,
                message: uploadResult.error.message,
              });
              notify.error(uploadResult.error.message || '이미지 업로드에 실패했어요', '❌');
              setIsSaving(false);
              setIsUploadingImage(false);
              return;
            }

            if (!uploadResult.url || uploadResult.url.trim() === '') {
              console.error('[Record] 이미지 업로드 성공했지만 URL이 없음:', {
                uploadResult,
              });
              notify.error('이미지 업로드는 성공했지만 URL을 가져오지 못했어요', '❌');
              setIsSaving(false);
              setIsUploadingImage(false);
              return;
            }

            imageUrl = uploadResult.url;
            console.log('[Record] 이미지 업로드 성공:', {
              imageUrl,
              urlLength: imageUrl.length,
            });

            // 기존 이미지가 있으면 삭제
            if (isEditing && editingRecordId) {
              const existing = emotions.find((e) => e.id === editingRecordId);
              if (existing?.image_url && existing.image_url !== imageUrl) {
                await deleteEmotionImage(existing.image_url);
              }
            }
          } else if (photos.length > 0 && photos[0].url && !photos[0].file) {
            // 기존 이미지 URL 유지
            imageUrl = photos[0].url;
            console.log('[Record] 기존 이미지 URL 유지:', {
              imageUrl,
              urlLength: imageUrl.length,
            });
          } else {
            console.log('[Record] 이미지 없음:', {
              photosLength: photos.length,
              hasFile: photos.some((p) => p.file !== null),
              hasUrl: photos.some((p) => p.url && !p.file),
            });
          }

          setIsUploadingImage(false);

          // payload 준비 (DB 스키마에 맞게)
          // emotion_type → main_emotion (useEmotions에서 변환)
          // content는 그대로 사용
          // emotion_date는 recordDate 사용
          // category는 공감숲 공유 시 첫 번째 카테고리 영문키 사용
          // image_url은 업로드된 이미지 URL 또는 기존 이미지 URL
          // content 검증 (최소 5자 이상)
          const trimmedContent = note.trim();
          if (trimmedContent.length < 5) {
            notify.warning('내용을 5자 이상 입력해주세요', '⚠️');
            setIsSaving(false);
            setIsUploadingImage(false);
            return;
          }

          const payload: {
            emotion_type: string;
            content: string;
            emotion_date?: string;
            is_public?: boolean | null;
            category?: string | null; // 공감숲 카테고리 영문키 (공유 시)
            image_url?: string | null; // 이미지 URL
          } = {
            emotion_type: selectedEmotion.label,
            content: trimmedContent,
            emotion_date: recordDate, // YYYY-MM-DD
            is_public: isPublic || null,
            category:
              isSharedToForest && selectedCategories.length > 0
                ? selectedCategories[0] // 첫 번째 카테고리 영문키 (이미 id로 저장됨)
                : null,
            // image_url은 빈 문자열이 아닌 경우에만 포함
            image_url: imageUrl && imageUrl.trim() !== '' ? imageUrl : null,
          };

          console.log('[Record] 저장 payload 검증:', {
            emotion_type: payload.emotion_type,
            emotion_type_length: payload.emotion_type?.length,
            content: payload.content,
            content_length: payload.content.length,
            emotion_date: payload.emotion_date,
            is_public: payload.is_public,
            category: payload.category,
            image_url: payload.image_url,
            image_url_length: payload.image_url?.length,
            has_image: !!payload.image_url,
            payload_keys: Object.keys(payload),
            payload_values: Object.values(payload),
          });

          if (isEditing && editingRecordId) {
            // 수정
            const { data, error } = await updateEmotion(editingRecordId, payload);
            if (error) {
              notify.error('기록 수정에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
              return;
            }

            if (data) {
              // flowers 업데이트 (수정 모드: 성장 증가 없음) - 먼저 실행
              let flowerUpdated = false;
              try {
                const emotionDate = recordDate || new Date().toISOString().split('T')[0];
                const updatedFlowerResult = await updateFlowerGrowth(
                  user.id,
                  emotionDate,
                  false, // isNewRecord: 수정 모드 (성장 증가 없음)
                  false // isPublic: 수정 모드에서는 포인트 증가 없음
                );
                if (!updatedFlowerResult.error && updatedFlowerResult.data) {
                  flowerUpdated = true;
                  console.log('[Record] 수정 후 flowers 업데이트 완료 (성장 증가 없음):', {
                    userId: user.id,
                    growthPercent: updatedFlowerResult.data.growth_percent,
                    emotionDate,
                  });
                }
              } catch (flowerError) {
                console.error('[Record] 수정 후 flowers 업데이트 중 오류:', {
                  error: flowerError,
                  errorMessage:
                    flowerError instanceof Error ? flowerError.message : String(flowerError),
                  userId: user.id,
                });
              }

              // 홈 데이터 refetch (flowers 업데이트 후 실행)
              try {
                await refetchHomeData();
                console.log('[Record] 수정 후 홈 데이터 refetch 완료 (flowers 업데이트 후):', {
                  flowerUpdated,
                  userId: user.id,
                });
              } catch (refetchError) {
                console.error('[Record] 수정 후 홈 데이터 refetch 실패:', {
                  error: refetchError,
                  errorMessage:
                    refetchError instanceof Error ? refetchError.message : String(refetchError),
                  userId: user.id,
                });
              }

              // 알림 생성: 기록 수정 완료
              try {
                await createNotification(user.id, 'record_updated', { recordId: data.id });
                // 알림 센터 새로고침
                if (typeof (window as any).__refreshNotifications === 'function') {
                  (window as any).__refreshNotifications();
                }
              } catch (notifError) {
                console.error('[Record] 수정 알림 생성 실패:', {
                  error: notifError,
                  errorMessage:
                    notifError instanceof Error ? notifError.message : String(notifError),
                  userId: user.id,
                });
              }

              // 가이드: "기록이 새로운 마음에 맞게 업데이트되었어요."
              notify.success('기록이 새로운 마음에 맞게 업데이트되었어요.', '💧');
              // 목록 갱신 후 뒤로가기
              await fetchEmotions();
              goBack();
            }
          } else {
            // 새로 생성
            console.log('[Record] addEmotion 호출 시작', {
              payload,
              userId: user?.id,
              hasUser: !!user,
            });

            const { data, error } = await addEmotion(payload);

            if (error) {
              console.error('[Record] addEmotion 실패:', {
                error,
                errorMessage: error.message,
                errorCode: (error as any)?.code,
                errorDetails: (error as any)?.details,
                errorHint: (error as any)?.hint,
                payload: {
                  ...payload,
                  content_length: payload.content.length,
                  has_image: !!payload.image_url,
                },
                userId: user?.id,
                // Supabase 에러 상세 정보
                supabaseError: (error as any)?.supabaseError,
                statusCode: (error as any)?.statusCode,
              });

              // 400 에러인 경우 더 자세한 정보 제공
              if ((error as any)?.code === '400' || (error as any)?.statusCode === 400) {
                console.error('[Record] 400 Bad Request 에러 - payload 검증 필요:', {
                  payload,
                  content: payload.content,
                  content_length: payload.content.length,
                  emotion_type: payload.emotion_type,
                  image_url: payload.image_url,
                  is_public: payload.is_public,
                  category: payload.category,
                  emotion_date: payload.emotion_date,
                });
              }

              notify.error(
                error.message || '기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.',
                '❌'
              );
              setIsSaving(false);
              setIsUploadingImage(false);
              return;
            }

            if (!data) {
              console.error('[Record] addEmotion 성공했지만 data가 null:', {
                payload,
                userId: user?.id,
                error,
              });
              notify.error('기록이 저장되었지만 데이터를 불러오지 못했어요.', '❌');
              return;
            }

            console.log('[Record] addEmotion 성공:', {
              recordId: data.id,
              mainEmotion: data.main_emotion, // DB 스키마: main_emotion
              userId: data.user_id,
            });

            trackEvent('emotion_created', {
              is_guest: false,
              is_public: isPublic,
              emotion_category: payload.category ?? undefined,
            });
            if (isSharedToForest) {
              trackEvent('community_post_created', {
                is_guest: false,
                emotion_category: payload.category ?? undefined,
                is_public: true,
              });
            }

            // flowers 성장 업데이트 (신규 기록만 성장 증가) - 먼저 실행
            // 설계서: 공개 기록 +10pt, 개인 기록 +5pt
            let flowerUpdated = false;
            try {
              const updatedFlowerResult = await updateFlowerGrowth(
                user.id,
                recordDate, // YYYY-MM-DD
                true, // isNewRecord: 신규 기록
                isSharedToForest || isPublic // isPublic: 공개 기록 여부
              );
              if (!updatedFlowerResult.error && updatedFlowerResult.data) {
                flowerUpdated = true;
                console.log('[Record] flowers 성장 업데이트 성공:', {
                  userId: user.id,
                  growthPercent: updatedFlowerResult.data.growth_percent,
                  isBloomed: updatedFlowerResult.data.is_bloomed,
                  emotionDate: recordDate,
                });
              } else {
                console.warn('[Record] flowers 성장 업데이트 실패 (null 반환):', {
                  userId: user.id,
                  emotionDate: recordDate,
                });
              }
            } catch (flowerError) {
              console.error('[Record] flowers 성장 업데이트 중 오류:', {
                error: flowerError,
                errorMessage:
                  flowerError instanceof Error ? flowerError.message : String(flowerError),
                userId: user.id,
                emotionDate: recordDate,
              });
            }

            // 홈 데이터 refetch (flowers 업데이트 후 실행하여 게이지 즉시 반영)
            // refetchHomeData를 강제로 호출하여 홈 화면 게이지 즉시 업데이트
            try {
              console.log('[Record] 홈 데이터 refetch 시작:', { flowerUpdated, userId: user.id });
              await refetchHomeData();
              console.log('[Record] 홈 데이터 refetch 완료 (flowers 업데이트 후):', {
                flowerUpdated,
                userId: user.id,
                timestamp: new Date().toISOString(),
              });
            } catch (refetchError) {
              console.error('[Record] 홈 데이터 refetch 실패:', {
                error: refetchError,
                errorMessage:
                  refetchError instanceof Error ? refetchError.message : String(refetchError),
                errorCode: (refetchError as any)?.code,
                errorDetails: (refetchError as any)?.details,
                errorHint: (refetchError as any)?.hint,
                userId: user.id,
              });
            }

            // 알림 생성: 감정 신규 기록 (가이드에 맞게 분기)
            try {
              // 첫 기록 여부 확인
              const isFirstRecord = emotions.length === 0;

              let notificationType: 'first_record' | 'record_saved';
              let notificationMessage: string;

              if (isFirstRecord) {
                // 첫 기록: "첫 기록이 저장되었어요. 감정 정원에 씨앗이 자랐어요."
                notificationType = 'first_record';
                notificationMessage = '첫 기록이 저장되었어요. 감정 정원에 씨앗이 자랐어요.';
              } else if (isSharedToForest || isPublic) {
                // 공개 기록 (공감숲 공유): "공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요."
                notificationType = 'record_saved';
                notificationMessage = '공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요.';
              } else {
                // 비공개 기록: "오늘의 감정이 기록이 조용히 정원에 저장되었어요."
                notificationType = 'record_saved';
                notificationMessage = '오늘의 감정이 기록이 조용히 정원에 저장되었어요.';
              }

              await createNotification(
                user.id,
                notificationType,
                { recordId: data.id, isPublic, isSharedToForest },
                {
                  message: notificationMessage,
                }
              );
              console.log('[Record] 감정 기록 알림 생성 성공:', {
                userId: user.id,
                recordId: data.id,
                type: notificationType,
                isFirstRecord,
                isPublic,
                isSharedToForest,
              });

              // 알림 센터 새로고침 (Header에서 사용)
              if (typeof (window as any).__refreshNotifications === 'function') {
                (window as any).__refreshNotifications();
              }
            } catch (notifError) {
              console.error('[Record] 감정 기록 알림 생성 실패:', {
                error: notifError,
                errorMessage: notifError instanceof Error ? notifError.message : String(notifError),
                errorCode: (notifError as any)?.code,
                errorDetails: (notifError as any)?.details,
                errorHint: (notifError as any)?.hint,
                userId: user.id,
              });
            }

            // 가이드에 맞게 토스트 메시지 분기
            if (isSharedToForest) {
              // 공감숲 공유: "공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요."
              notify.success('공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요.', '💧');
            } else if (isPublic) {
              // 공개 기록: "공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요."
              notify.success('공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요.', '💧');
            } else {
              // 비공개 기록: "오늘의 감정이 기록이 조용히 정원에 저장되었어요."
              notify.success('오늘의 감정이 기록이 조용히 정원에 저장되었어요.', '💧');
            }

            // 목록 갱신 후 폼 초기화 및 이동
            await fetchEmotions();

            // 폼 초기화
            setSelectedEmotion(null);
            setNote('');
            setPhotos([]);
            setSelectedCategories([]);
            navigate('/');
          }
        } catch (err) {
          console.error('[Record] 저장 실패 - 상세 에러:', {
            error: err,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack : undefined,
            errorName: err instanceof Error ? err.name : undefined,
            userId: user?.id,
            isEditing,
            // Supabase 에러 정보
            supabaseError: (err as any)?.supabaseError,
            code: (err as any)?.code,
            statusCode: (err as any)?.statusCode,
            details: (err as any)?.details,
            hint: (err as any)?.hint,
            message: (err as any)?.message,
            // 네트워크 에러 체크
            isNetworkError:
              err instanceof Error &&
              (err.message?.includes('fetch') ||
                err.message?.includes('network') ||
                err.message?.includes('Failed to fetch') ||
                err.message?.includes('400')),
            // RLS 에러 체크
            isRLSError:
              (err as any)?.code === '42501' ||
              (err as any)?.message?.includes('permission denied') ||
              (err as any)?.message?.includes('RLS') ||
              (err as any)?.message?.includes('row-level security'),
            // 전체 에러 객체 (직렬화 가능한 부분만)
            errorObject:
              err instanceof Error
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                  }
                : err,
          });

          // 에러 타입별 사용자 메시지
          let userMessage = '저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
          if (err instanceof Error) {
            if (err.message?.includes('400') || (err as any)?.statusCode === 400) {
              userMessage = '요청 형식이 올바르지 않아요. 입력 내용을 확인해주세요.';
            } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
              userMessage = '네트워크 연결을 확인해주세요.';
            } else if ((err as any)?.code === '42501' || err.message?.includes('permission')) {
              userMessage = '저장 권한이 없어요. 로그인 상태를 확인해주세요.';
            }
          }

          notify.error(userMessage, '❌');
        } finally {
          setIsSaving(false);
          setIsUploadingImage(false);
        }
      },
      {
        customMessage: '감정 기록을 저장하려면 로그인 또는 가입이 필요해요.',
      }
    );
  }

  const emotionHelperText = selectedEmotion
    ? `오늘은 “${selectedEmotion.label}” 감정이 가장 크게 느껴졌네요.`
    : '오늘의 대표 감정을 하나 골라주세요.';
  const heroTitle = isEditing ? '기록 수정' : '오늘의 감정 기록하기';
  const heroDesc = isEditing
    ? '남겨둔 기록을 다시 정리해 보세요.'
    : '오늘 하루를 떠올리며, 가볍게 마음을 남겨보세요.';
  const saveButtonLabel = isEditing ? '수정 완료' : '저장하기';

  return (
    <Layout hideHeader>
      <div className="record-page">
        <PageHeader title={heroTitle} subtitle={heroDesc} />

        <section className="ms-section">
          <div className="ms-section-label">
            오늘 날짜
            <span className="helper">기록은 선택된 날짜 기준으로 저장돼요.</span>
          </div>
          <div className="ms-today-row">
            <div className="ms-today-label">{isEditing ? '수정 중인 날짜' : '지금 기록하기'}</div>
            <div className="ms-today-date">{recordDate}</div>
          </div>
        </section>

        <section className="ms-section">
          <div className="ms-section-label">
            오늘은 어떤 하루였나요?
            <span className="helper">가장 크게 느껴진 감정을 1개 선택해 주세요.</span>
          </div>

          <div className="ms-emotion-grid">
            {EMOTION_OPTIONS.map((option) => {
              const selected = selectedEmotion?.code === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  className={`ms-emotion-btn ${selected ? 'selected' : ''}`}
                  title={option.label}
                  onClick={() => onSelectEmotion(option)}
                >
                  <div className="ms-emotion-emoji">{option.emoji}</div>
                  <div className="ms-emotion-label">{option.label}</div>
                </button>
              );
            })}
          </div>

          <div className="ms-emotion-helper">{emotionHelperText}</div>
        </section>

        <section className="ms-section">
          <div className="ms-section-label">
            오늘 하루에 대해 적어보세요
            <span className="helper">5자 이상부터 저장할 수 있어요.</span>
          </div>

          <textarea
            className="ms-textarea"
            maxLength={1000}
            value={note}
            placeholder={`오늘의 장면, 떠오르는 생각, 남기고 싶은 말을 자유롭게 적어보세요.\n예: ‘오늘은 한 줄기 햇빛처럼 마음이 조금 밝아졌어요.’`}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="ms-textarea-count">{note.length} / 1000</div>

          <div className="ms-photo-row">
            <div className="ms-photo-text">
              <div className="ms-photo-title">사진 첨부 (선택)</div>
              <div className="ms-photo-helper">
                오늘을 떠올리게 하는 사진이 있다면 함께 남겨보세요. (JPG, PNG / 10MB 이하 / 최대
                2개)
              </div>
            </div>
            <label className="ms-photo-upload">
              <span>📷 사진 추가</span>
              <input
                type="file"
                className="ms-photo-hidden-input"
                accept="image/*"
                multiple
                onChange={onPhotosChange}
              />
            </label>
          </div>

          <div className="ms-photo-preview-list">
            {photos.map((p) => (
              <div
                key={p.id}
                className="ms-photo-thumb"
                style={{ backgroundImage: `url(${p.url})` }}
              >
                <button
                  type="button"
                  className="ms-photo-thumb-remove"
                  onClick={() => onRemovePhoto(p.id)}
                  aria-label="사진 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="ms-section">
          <div className="ms-section-label">
            공개 설정
            <span className="helper">기본은 나만 보는 기록으로 저장돼요.</span>
          </div>

          <div className="ms-toggle-row">
            <div className="ms-toggle-text">
              <div className="ms-toggle-title">{isPublic ? '공개 기록' : '나만 보기'}</div>
              <div className="ms-toggle-sub">
                {isPublic
                  ? '공감숲에서 다른 사람도 이 기록을 볼 수 있어요.'
                  : '기록은 내 정원에서만 볼 수 있어요.'}
              </div>
            </div>
            <label className="ms-switch">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => onTogglePublic(e.target.checked)}
              />
              <span className="ms-switch-slider" />
            </label>
          </div>

          <div className="ms-checkbox-row" style={{ marginTop: 8 }}>
            <span>– 이 기록을 공감숲에 함께 띄우기</span>
          </div>
        </section>

        {showCategorySection && (
          <section className="ms-section">
            <div className="ms-section-label">
              감정 카테고리
              <span className="helper">공감숲에서 함께 보여질 주제를 선택해 주세요.</span>
            </div>
            <div className="ms-chip-row">
              {CATEGORIES.map((c) => {
                const on = selectedCategories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`ms-chip ${on ? 'selected' : ''}`}
                    onClick={() => onToggleCategory(c.id)}
                  >
                    <span style={{ marginRight: 6 }}>{c.emoji}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <button
          className="ms-btn ms-btn-primary"
          onClick={onSave}
          disabled={!isSaveEnabled || isSaving}
        >
          {isUploadingImage ? '사진 업로드 중...' : isSaving ? '저장 중…' : saveButtonLabel}
        </button>
      </div>
    </Layout>
  );
}
