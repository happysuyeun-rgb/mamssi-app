import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@components/Layout';
import { useAuth } from '@hooks/useAuth';
import { useEmotions } from '@hooks/useEmotions';
import { useNotify } from '@providers/NotifyProvider';
import { useActionGuard } from '@hooks/useActionGuard';
import { uploadEmotionImage, deleteEmotionImage } from '@utils/imageUpload';
import '@styles/page-hero.css';
import '@styles/record.css';
import { EMOTION_OPTIONS, type EmotionOption } from '@constants/emotions';
import { createNotification } from '@services/notifications';

type PhotoItem = { id: string; file: File | null; url: string };

const CATEGORIES = [
  { id: 'daily',     emoji: '🏡',  label: '일상' },
  { id: 'worry',     emoji: '💭',  label: '고민' },
  { id: 'love',      emoji: '💕',  label: '연애' },
  { id: 'work',      emoji: '💼',  label: '회사' },
  { id: 'humor',     emoji: '😆',  label: '유머' },
  { id: 'growth',    emoji: '🌱',  label: '성장' },
  { id: 'selfcare',  emoji: '🧘‍♀️', label: '자기돌봄' },
] as const;

export default function Record() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useNotify();
  const { requireAuthForAction } = useActionGuard();
  const { emotions, addEmotion, updateEmotion, fetchEmotions, checkTodayPrivateEmotion } = useEmotions({
    userId: user?.id || null
  });

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
    const next: PhotoItem[] = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        notify.warning('10MB 이하의 이미지만 첨부할 수 있어요', '⚠️');
        return;
      }
      const url = URL.createObjectURL(file);
      next.push({ id: `${file.name}-${file.size}-${Date.now()}` , file, url });
    });
    if (next.length) setPhotos((prev) => [...prev, ...next]);
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
      createNotification(user.id, 'record_visibility_changed', { isPublic: checked }).catch(() => {});
    }
  }

// 수정 모드: 기존 기록 불러오기
useEffect(() => {
  if (!isEditing || !editingRecordId || !user) return;

      const existing = emotions.find((e) => e.id === editingRecordId);
      if (!existing) {
        // 기록을 찾을 수 없으면 다시 불러오기 시도
        fetchEmotions().then(() => {
          const retry = emotions.find((e) => e.id === editingRecordId);
          if (!retry) {
            notify.warning('수정할 기록을 찾을 수 없어요', '⚠️');
            goBack();
          }
        });
        return;
      }

  const emotionOpt = EMOTION_OPTIONS.find((opt) => opt.label === existing.emotion_type);
  setSelectedEmotion(emotionOpt ?? null);
  setNote(existing.content);
  setIsPublic(existing.is_public);
  setSelectedCategories(existing.category_id ? [existing.category_id] : []);
  setRecordDate(new Date(existing.created_at).toISOString().split('T')[0]);
  if (existing.image_url) {
    setPhotos([{ id: existing.id, file: null, url: existing.image_url }]);
  } else {
    setPhotos([]);
  }
}, [editingRecordId, isEditing, goBack, emotions, user, fetchEmotions]);

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
        const uploadResult = await uploadEmotionImage(photoToUpload.file, user.id);
        if (uploadResult.error) {
          notify.error(uploadResult.error.message || '이미지 업로드에 실패했어요', '❌');
          setIsSaving(false);
          setIsUploadingImage(false);
          return;
        }
        imageUrl = uploadResult.url;

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
      }

      setIsUploadingImage(false);

      // payload 준비 (undefined 값 제외)
      const payload: {
        emotion_type: string;
        intensity?: number;
        content: string;
        image_url?: string | null;
        is_public: boolean;
        category_id?: string | null;
      } = {
        emotion_type: selectedEmotion.label,
        content: note.trim(),
        is_public: isPublic
      };

      // 선택적 필드만 추가
      if (imageUrl) {
        payload.image_url = imageUrl;
      }
      if (isPublic && selectedCategories.length > 0) {
        payload.category_id = selectedCategories[0];
      }

      if (isEditing && editingRecordId) {
        // 수정
        const { data, error } = await updateEmotion(editingRecordId, payload);
        if (error) {
          notify.error('기록 수정에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
          return;
        }

        if (data) {
          await createNotification(user.id, 'record_updated', { recordId: data.id });
          notify.success('기록이 저장되었습니다 💧');
          // 목록 갱신 후 뒤로가기
          await fetchEmotions();
          goBack();
        }
      } else {
        // 새로 생성
        try {
          const { data, error } = await addEmotion(payload);
          if (error) {
            console.error('[Record] addEmotion 실패:', {
              error,
              payload,
              userId: user?.id
            });
            notify.error('기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
            return;
          }

          if (!data) {
            console.error('[Record] addEmotion 성공했지만 data가 null:', {
              payload,
              userId: user?.id
            });
            notify.error('기록이 저장되었지만 데이터를 불러오지 못했어요.', '❌');
            return;
          }

          if (data) {
          const isFirstRecord = emotions.length === 0;
          await createNotification(user.id, 'record_saved', { recordId: data.id });
          if (isFirstRecord) {
            await createNotification(user.id, 'first_record', { recordId: data.id });
          }
          if (imageUrl) {
            await createNotification(user.id, 'record_with_image', { recordId: data.id });
          }
          if (isPublic) {
            await createNotification(user.id, 'record_visibility_changed', {
              recordId: data.id,
              isPublic: true
            });
          }

          if (isSharedToForest) {
            notify.success('기록이 저장되고 공감숲에도 함께 심어졌어요 💧');
          } else if (isPublic) {
            notify.success('기록이 저장되었습니다 💧');
          } else {
            notify.success('기록이 저장되었습니다 💧');
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
        } catch (addErr) {
          console.error('[Record] addEmotion 예외:', {
            error: addErr,
            payload,
            userId: user?.id
          });
          notify.error('기록 저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.', '❌');
          return;
        }
      }
    } catch (err) {
      console.error('[Record] 저장 실패:', {
        error: err,
        userId: user?.id,
        isEditing
      });
      notify.error('저장에 실패했어요. 잠시 후 다시 시도해 주세요.', '❌');
      } finally {
        setIsSaving(false);
        setIsUploadingImage(false);
      }
    },
    {
      customMessage: '감정 기록을 저장하려면 로그인 또는 가입이 필요해요.'
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
        <div className="page-hero">
          <div className="page-hero-icon" aria-hidden="true">📝</div>
          <div>
            <h1 className="page-hero-title">{heroTitle}</h1>
            <p className="page-hero-desc">{heroDesc}</p>
          </div>
        </div>

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
                  오늘을 떠올리게 하는 사진이 있다면 함께 남겨보세요. (JPG, PNG / 10MB 이하)
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
                <div key={p.id} className="ms-photo-thumb" style={{ backgroundImage: `url(${p.url})` }}>
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
