import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@components/Layout';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { useActionGuard } from '@hooks/useActionGuard';
import { useEmotions } from '@hooks/useEmotions';
import { useSettings } from '@hooks/useSettings';
import { uploadProfileImage, deleteProfileImage } from '@utils/profileImageUpload';
import { hashLockValue } from '@utils/lockHash';
import { lsGet, lsSet } from '@utils/storage';
import '@styles/page-hero.css';
import '@styles/mypage.css';
import { drawFlowerCanvas } from '@canvas/drawFlowerCanvas';
import type { LockSettings, LockMode } from '../types/lock';
import { LOCK_SESSION_KEY } from '../types/lock';
import { loadLockSettings, saveLockSettings } from '@utils/lock';
import { EMOTION_OPTIONS } from '@constants/emotions';

type Profile = { name: string; mbti: string; img: string | null };
type Settings = { emp: boolean; time: string };
type AlbumItem = { id: string; title: string; date: string; water: number; emoji: string; message?: string };

const profileKey = 'ms_profile';
const setKey = 'ms_settings';
const albumKey = 'ms_album';

const PATTERN_GRID = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];

export default function MyPage() {
  const navigate = useNavigate();
  const { user, isGuest, session, signOut } = useAuth();
  const notify = useNotify();
  const { requireAuthForAction } = useActionGuard();
  const { emotions, loading: emotionsLoading, fetchEmotions } = useEmotions({
    userId: user?.id || null
  });
  const { settings: dbSettings, updateSettings, loading: settingsLoading } = useSettings(user?.id || null);

  // Profile/Settings/Lock (로컬 상태 + DB 동기화)
  const [profile, setProfile] = useState<Profile>(() => {
    if (dbSettings) {
      return {
        name: dbSettings.nickname || '수연',
        mbti: dbSettings.mbti || 'ENFJ',
        img: dbSettings.profile_url || null
      };
    }
    return lsGet<Profile>(profileKey, { name: '수연', mbti: 'ENFJ', img: null });
  });
  const [settings, setSettings] = useState<Settings>(lsGet<Settings>(setKey, { emp: true, time: '21:00' }));
  const [lock, setLock] = useState<LockSettings>(() => {
    if (dbSettings && dbSettings.lock_type) {
      return {
        enabled: true,
        mode: dbSettings.lock_type,
        pattern: [],
        pin: '',
        biometricEnabled: false
      };
    }
    return loadLockSettings();
  });

  // DB 설정이 로드되면 프로필 상태 동기화
  useEffect(() => {
    if (dbSettings && !isGuest) {
      setProfile({
        name: dbSettings.nickname || '수연',
        mbti: dbSettings.mbti || 'ENFJ',
        img: dbSettings.profile_url || null
      });
      if (dbSettings.lock_type) {
        setLock((prev) => ({
          ...prev,
          enabled: true,
          mode: dbSettings.lock_type as LockMode
        }));
      }
    }
  }, [dbSettings, isGuest]);

  // 초기 데이터 로드
  useEffect(() => {
    if (user && !isGuest) {
      fetchEmotions();
    }
  }, [user, isGuest, fetchEmotions]);

  // Album
  const [album, setAlbum] = useState<AlbumItem[]>(lsGet<AlbumItem[]>(albumKey, []));
  useEffect(() => {
    if (album.length === 0) {
      const seed: AlbumItem[] = [
        { id: 'a1', title: '잎 너므해', date: '2025-11-05', water: 1, emoji: '🌸', message: '따뜻한 하루' },
        { id: 'a2', title: '두번저장안됨', date: '2025-11-03', water: 1, emoji: '🌷', message: '' },
        { id: 'a3', title: '봄비', date: '2025-10-22', water: 2, emoji: '🌼', message: '소중한 기억' }
      ];
      setAlbum(seed);
      lsSet(albumKey, seed);
    }
  }, []);

  // Modals
  const [mProfile, setMProfile] = useState(false);
  const [mAlert, setMAlert] = useState(false);
  const [mAlbum, setMAlbum] = useState(false);
  const [mFlower, setMFlower] = useState(false);
  const [mExport, setMExport] = useState(false);
  const [mLock, setMLock] = useState(false);
  const [mSupport, setMSupport] = useState(false);

  // Persist
  useEffect(() => { lsSet(profileKey, profile); }, [profile]);
  useEffect(() => { lsSet(setKey, settings); }, [settings]);
  useEffect(() => { saveLockSettings(lock); }, [lock]);
  useEffect(() => { lsSet(albumKey, album); }, [album]);


  // Profile edits
  const fileAvatarRef = useRef<HTMLInputElement | null>(null);
  const onUploadAvatarClick = () => {
    requireAuthForAction(
      'upload_profile_image',
      () => {
        fileAvatarRef.current?.click();
      },
      {
        customMessage: '프로필 사진을 업로드하려면 로그인 또는 가입이 필요해요.'
      }
    );
  };
  async function onFileAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) return;

    requireAuthForAction(
      'upload_profile_image_file',
      async () => {
        try {
          const result = await uploadProfileImage(file, user.id);
          if (result.error) {
            notify.error(result.error.message || '프로필 이미지 업로드에 실패했어요', '❌');
            return;
          }
          if (result.url) {
            await updateSettings({ profile_url: result.url });
            setProfile((prev) => ({ ...prev, img: result.url }));
            notify.success('프로필 이미지가 적용되었어요', '✅');
          }
        } catch (err) {
          console.error('프로필 이미지 업로드 실패:', err);
          notify.error('프로필 이미지 업로드에 실패했어요', '❌');
        }
      },
      {
        customMessage: '프로필 사진을 업로드하려면 로그인 또는 가입이 필요해요.'
      }
    );
  }
  async function onDefaultEmoji() {
    requireAuthForAction(
      'set_default_emoji',
      async () => {
        if (!user) return;

        try {
          await deleteProfileImage(user.id);
          await updateSettings({ profile_url: null });
          setProfile((prev) => ({ ...prev, img: null }));
          notify.success('기본 이모티콘 프로필로 변경했어요', '✅');
        } catch (err) {
          console.error('프로필 이미지 삭제 실패:', err);
          notify.error('프로필 이미지 삭제에 실패했어요', '❌');
        }
      },
      {
        customMessage: '기본 이모티콘으로 변경하려면 로그인 또는 가입이 필요해요.'
      }
    );
  }
  async function onEditName() {
    requireAuthForAction(
      'edit_nickname',
      async () => {
        const current = profile.name || '수연';
        const next = window.prompt('사용할 닉네임을 입력해주세요 (1~12자)', current);
        if (next === null) return;
        const trimmed = next.trim();
        if (!trimmed) return notify.warning('닉네임을 비워둘 수는 없어요', '⚠️');
        if (trimmed.length > 12) return notify.warning('닉네임은 1~12자로 입력해 주세요', '⚠️');
        const forbidden = ['시발', '씨발', '개새', '좆', 'fuck', 'shit'];
        if (forbidden.some((w) => trimmed.toLowerCase().includes(w)))
          return notify.warning('조금 더 다정한 닉네임으로 바꿔볼까요?', '⚠️');

        try {
          await updateSettings({ nickname: trimmed });
          setProfile((prev) => ({ ...prev, name: trimmed }));
          notify.success('프로필이 업데이트되었습니다 ✨', '✨');
        } catch (err) {
          console.error('닉네임 업데이트 실패:', err);
          notify.error('닉네임 업데이트에 실패했어요', '❌');
        }
      },
      {
        customMessage: '닉네임을 수정하려면 로그인 또는 가입이 필요해요.'
      }
    );
  }
  async function onMBTIChange(mbti: string) {
    requireAuthForAction(
      'change_mbti',
      async () => {
    try {
      await updateSettings({ mbti });
      setProfile((prev) => ({ ...prev, mbti }));
    } catch (err) {
      console.error('MBTI 업데이트 실패:', err);
      notify.error('MBTI 업데이트에 실패했어요', '❌');
      }
    },
    {
      customMessage: 'MBTI를 변경하려면 로그인 또는 가입이 필요해요.'
    }
  );
  }

  // Alert save
  function onSaveAlert() {
    setMAlert(false);
    notify.success('알림 설정을 저장했어요', '✅');
  }

  // Lock temp states
  const [lockEnabledDraft, setLockEnabledDraft] = useState(lock.enabled);
  const [lockModeDraft, setLockModeDraft] = useState<LockMode>(lock.mode);
  const [patternDraft, setPatternDraft] = useState<number[]>(lock.pattern ?? []);
  const [patternError, setPatternError] = useState('');
  const [pinDraft, setPinDraft] = useState(lock.pin ?? '');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (mLock) {
      setLockEnabledDraft(lock.enabled);
      setLockModeDraft(lock.mode);
      setPatternDraft(lock.pattern ?? []);
      setPinDraft(lock.pin ?? '');
      setPatternError('');
      setPinError('');
    }
  }, [mLock, lock]);

  useEffect(() => {
    if (!lockEnabledDraft) {
      setPatternError('');
      setPinError('');
    }
  }, [lockEnabledDraft]);

  const handlePatternNode = (point: number) => {
    setPatternError('');
    setPatternDraft(prev => {
      if (!prev.length) return [point];
      if (prev[prev.length - 1] === point) {
        return prev.slice(0, -1);
      }
      if (prev.includes(point)) return prev;
      return [...prev, point];
    });
  };

  const resetPatternDraft = () => {
    setPatternDraft([]);
    setPatternError('');
  };

  const handlePinDraftChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPinDraft(digits);
    setPinError('');
  };

  const handleLockSave = async () => {
    requireAuthForAction(
      'save_lock_settings',
      async () => {

    if (lockEnabledDraft) {
      if (lockModeDraft === 'pattern' && patternDraft.length < 4) {
        setPatternError('패턴은 최소 4개의 점을 연결해야 해요.');
        return;
      }
      if (lockModeDraft === 'pin' && pinDraft.length !== 4) {
        setPinError('PIN은 4자리 숫자여야 해요.');
        return;
      }
    }

    try {
      let lockType: 'pattern' | 'pin' | null = null;
      let lockValue: string | null = null;

      if (lockEnabledDraft) {
        lockType = lockModeDraft;
        if (lockModeDraft === 'pattern') {
          lockValue = await hashLockValue(patternDraft);
        } else {
          lockValue = await hashLockValue(pinDraft);
        }
      }

      await updateSettings({
        lock_type: lockType,
        lock_value: lockValue
      });

      const now = new Date().toISOString();
      const next: LockSettings = {
        ...lock,
        enabled: lockEnabledDraft,
        mode: lockModeDraft,
        pattern: lockEnabledDraft && lockModeDraft === 'pattern' ? patternDraft : [],
        pin: lockEnabledDraft && lockModeDraft === 'pin' ? pinDraft : '',
        updatedAt: now,
        createdAt: lock.createdAt || (lockEnabledDraft ? now : lock.createdAt),
        biometricEnabled: lock.biometricEnabled
      };
      if (!lockEnabledDraft) {
        next.pattern = [];
        next.pin = '';
      }

      sessionStorage.removeItem(LOCK_SESSION_KEY);
      setLock(next);
      saveLockSettings(next); // 로컬에도 저장 (오프라인 대비)
      setMLock(false);
      notify.success(lockEnabledDraft ? '잠금 설정을 저장했어요' : '화면 잠금을 해제했어요', '✅');
    } catch (err) {
      console.error('잠금 설정 저장 실패:', err);
      notify.error('잠금 설정 저장에 실패했어요', '❌');
      }
    },
    {
      customMessage: '잠금 설정을 변경하려면 로그인 또는 가입이 필요해요.'
    }
  );
  };

  // Album detail
  const [curFlower, setCurFlower] = useState<AlbumItem | null>(null);
  const flowerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [flowerMessage, setFlowerMessage] = useState('');
  useEffect(() => {
    if (mFlower && curFlower && flowerCanvasRef.current) {
      drawFlowerCanvas(flowerCanvasRef.current, {
        title: curFlower.title,
        date: curFlower.date,
        water: curFlower.water,
        emoji: curFlower.emoji,
        message: flowerMessage || curFlower.message
      });
    }
  }, [mFlower, curFlower, flowerMessage]);

  function openFlower(it: AlbumItem) {
    setCurFlower(it);
    setFlowerMessage(it.message ?? '');
    setMAlbum(false);
    setTimeout(() => setMFlower(true), 0);
  }
  function saveFlowerMessage() {
    if (!curFlower) return;
    if (flowerMessage.length > 15) {
      notify.warning('한 줄 메시지는 15자 이내로 입력해 주세요.', '⚠️');
      return;
    }
    setAlbum(prev =>
      prev.map(item =>
        item.id === curFlower.id ? { ...item, message: flowerMessage } : item
      )
    );
    setCurFlower(prev => (prev ? { ...prev, message: flowerMessage } : prev));
    notify.success('한 줄 메시지를 저장했어요.', '✅');
  }
  function downloadFlower() {
    const canvas = flowerCanvasRef.current;
    if (!canvas || !curFlower) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = (curFlower?.title || 'maeumssi_flower') + '.png';
    a.click();
  }
  function shareFlower() {
    const canvas = flowerCanvasRef.current;
    if (!canvas || !curFlower) return;
    const url = canvas.toDataURL('image/png');
    if (navigator.share) {
      navigator.share({
        title: '마음씨 감정꽃',
        text: `${curFlower.title} · 공감 ${curFlower.water}`
      }).catch(() => {});
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = (curFlower?.title || 'maeumssi_flower') + '.png';
      a.click();
    }
  }

  // Export: Supabase 데이터 사용
  function downloadJSON() {
    requireAuthForAction(
      'download_json',
      () => {
        const data = emotions.map((e) => {
          const date = new Date(e.created_at).toISOString().split('T')[0];
          return {
            date,
            mood: e.emotion_type,
            text: e.content,
            public: e.is_public,
            category: e.category || null,
            image_url: e.image_url || null,
            created_at: e.created_at,
            updated_at: e.updated_at
          };
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `maeumssi_records_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        notify.success('JSON 파일을 다운로드했어요.', '✅');
      },
      {
        customMessage: '데이터를 다운로드하려면 로그인 또는 가입이 필요해요.'
      }
    );
  }

  function downloadCSV() {
    requireAuthForAction(
      'download_csv',
      () => {
        const arr = emotions.map((e) => {
          const date = new Date(e.created_at).toISOString().split('T')[0];
          return {
            date,
            mood: e.emotion_type,
            text: e.content,
            public: e.is_public ? '공개' : '비공개',
            category: e.category || '',
            image_url: e.image_url || '',
            created_at: e.created_at,
            updated_at: e.updated_at
          };
        });

        if (arr.length === 0) {
          notify.info('다운로드할 기록이 없어요.', 'ℹ️');
          return;
        }

        const header = Object.keys(arr[0]).join(',');
        const lines = arr
          .map((o) =>
            Object.values(o)
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(',')
          )
          .join('\n');
        const blob = new Blob([header + '\n' + lines], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `maeumssi_records_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        notify.success('CSV 파일을 다운로드했어요.', '✅');
      },
      {
        customMessage: '데이터를 다운로드하려면 로그인 또는 가입이 필요해요.'
      }
    );
  }

  // Support
  const [qEmail, setQEmail] = useState('');
  const [qSubj, setQSubj] = useState('');
  const [qBody, setQBody] = useState('');
  function sendSupport() {
    const subj = encodeURIComponent(qSubj || '마음씨 문의');
    const body = encodeURIComponent(qBody || '');
    location.href = `mailto:${qEmail}?subject=${subj}&body=${body}`;
  }

  const canSaveLock =
    !lockEnabledDraft ||
    (lockModeDraft === 'pattern' ? patternDraft.length >= 4 : pinDraft.length === 4);

  return (
    <Layout hideHeader>
      <div className="mypage-root">

        {/* 상단 프로필 섹션 */}
        <section className="mypage-profile">
          <div className="mypage-profile-main">
            <div className="avatar" data-has={profile.img ? 'img' : 'emo'}>
              {profile.img ? (
                <img alt="프로필" src={profile.img} />
              ) : (
                <div className="emo">🙂</div>
              )}
            </div>
            <div>
              <div className="nickname-row">
                <div className="nickname">{profile.name}</div>
                <button type="button" className="name-edit" aria-label="닉네임 수정" onClick={onEditName}>✏️</button>
              </div>
              <div className="bio">MBTI {profile.mbti}</div>
              <div className="badges">
                <div className="badge">
                  <span className="badge-icon">📝</span>
                  기록 <b>{emotionsLoading ? '...' : emotions.length}</b>
                </div>
                <div className="badge">
                  <span className="badge-icon">💧</span>
                  공감 <b>{emotionsLoading ? '...' : emotions.filter((e) => e.is_public).length}</b>
                </div>
                <div className="badge">
                  <span className="badge-icon">🌸</span>
                  개화 <b>{album.length}</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 계정 정보 섹션 */}
        {user && session && (
          <section className="mypage-profile" style={{ marginTop: 20 }}>
            <div style={{ 
              fontSize: 15, 
              fontWeight: 700, 
              marginBottom: 16,
              color: 'var(--ms-text-main)'
            }}>
              계정 정보
            </div>

            {/* 내 프로필 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                marginBottom: 10,
                color: 'var(--ms-ink-soft)'
              }}>
                내 프로필
              </div>
              <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ms-ink-muted)' }}>사용자 ID</span>
                  <span style={{ color: 'var(--ms-ink-soft)', fontFamily: 'monospace', fontSize: 12 }}>
                    {user.id.substring(0, 8)}...
                  </span>
                </div>
                {dbSettings?.nickname && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ms-ink-muted)' }}>닉네임</span>
                    <span style={{ color: 'var(--ms-ink-soft)' }}>{dbSettings.nickname}</span>
                  </div>
                )}
                {dbSettings?.birthdate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ms-ink-muted)' }}>생일</span>
                    <span style={{ color: 'var(--ms-ink-soft)' }}>{dbSettings.birthdate}</span>
                  </div>
                )}
                {dbSettings?.gender && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ms-ink-muted)' }}>성별</span>
                    <span style={{ color: 'var(--ms-ink-soft)' }}>{dbSettings.gender}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 로그인 정보 */}
            <div>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                marginBottom: 10,
                color: 'var(--ms-ink-soft)'
              }}>
                로그인 정보
              </div>
              <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ms-ink-muted)' }}>소셜 제공자</span>
                  <span style={{ color: 'var(--ms-ink-soft)' }}>
                    {(() => {
                      const provider = session.user.app_metadata?.provider;
                      const providerMap: Record<string, string> = {
                        google: 'Google',
                        apple: 'Apple',
                        kakao: 'Kakao',
                        facebook: 'Facebook',
                        line: 'LINE'
                      };
                      return providerMap[provider || ''] || provider || '알 수 없음';
                    })()}
                  </span>
                </div>
                {user.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ms-ink-muted)' }}>이메일</span>
                    <span style={{ color: 'var(--ms-ink-soft)', fontSize: 12 }}>{user.email}</span>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => notify.info('소셜 계정 관리는 준비 중이에요.', 'ℹ️')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--ms-line)',
                      background: '#fff',
                      color: 'var(--ms-ink-soft)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    소셜 계정 관리
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 설정 카드 리스트 */}
        <div className="card sub" onClick={() => setMProfile(true)}>
          <div>
            <div className="tt">프로필 설정</div>
            <div className="sub">닉네임, MBTI, 프로필 사진 · 기본 이모티콘 설정</div>
          </div>
          <div className="chev">›</div>
        </div>

        <div className="card" onClick={() => setMAlert(true)}>
          <div><div className="tt">알림 설정</div></div>
          <div className="chev">›</div>
        </div>

        <div className="card" onClick={() => setMAlbum(true)}>
          <div><div className="tt">감정꽃 앨범</div></div>
          <div className="chev">›</div>
        </div>

        <div className="card" onClick={() => setMExport(true)}>
          <div><div className="tt">감정기록 모아보기</div></div>
          <div className="chev">›</div>
        </div>

        <div className="card" onClick={() => setMLock(true)}>
          <div><div className="tt">화면 잠금</div></div>
          <div className="chev">›</div>
        </div>

        <div className="card" onClick={() => setMSupport(true)}>
          <div><div className="tt">고객 문의</div></div>
          <div className="chev">›</div>
        </div>

        {/* 로그아웃 버튼 (로그인 상태에서만 표시) */}
        {user && session && (
          <div className="card" onClick={async () => {
            if (!confirm('정말 로그아웃하시겠어요?')) return;
            try {
              await signOut();
              navigate('/login', { replace: true });
            } catch (error) {
              console.error('로그아웃 실패:', error);
              notify.error('로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
            }
          }}>
            <div className="tt">로그아웃</div>
            <div className="chev">↪</div>
          </div>
        )}

        {/* 회원탈퇴 버튼 (로그인 상태에서만 표시) */}
        {user && session && (
          <div className="card danger" onClick={() => {
            navigate('/delete-account');
          }}>
            <div className="tt" style={{ color: '#ef4444' }}>회원탈퇴</div>
            <div className="chev" style={{ borderColor: '#fecaca', background: '#fff5f5' }}>✖</div>
          </div>
        )}
      </div>

      {/* 프로필 설정 모달 */}
      {mProfile && (
        <Modal onClose={() => setMProfile(false)}>
          <h3>프로필 설정</h3>
          <p className="hint">마음씨에서 보이는 나의 얼굴을 정리하는 공간이에요. 언제든지 다시 바꿀 수 있어요.</p>
          <div className="row">
            <div>MBTI</div>
            <div>
              <select
                value={profile.mbti}
                onChange={(e) => onMBTIChange(e.target.value)}
                className="input"
                disabled={isGuest}
              >
                {['ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <div>프로필 사진</div>
            <div>
              <div className="grid2" style={{ marginBottom: 8 }}>
                <button type="button" className="btn" onClick={onUploadAvatarClick} disabled={isGuest}>
                  사진 업로드
                </button>
                <button type="button" className="btn" onClick={onDefaultEmoji} disabled={isGuest}>
                  마음씨 기본 이모티콘
                </button>
              </div>
              <input type="file" ref={fileAvatarRef} accept="image/*" onChange={onFileAvatarChange} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setMProfile(false)}>
              닫기
            </button>
            <button
              className="btn primary"
              onClick={async () => {
                requireAuthForAction(
                  'save_profile',
                  () => {
                    // MBTI와 닉네임은 이미 onChange/onBlur에서 저장됨
                    setMProfile(false);
                    notify.success('프로필 정보를 저장했어요', '✅');
                  },
                  {
                    customMessage: '프로필 정보를 저장하려면 로그인 또는 가입이 필요해요.'
                  }
                );
              }}
              disabled={isGuest}
            >
              저장
            </button>
          </div>
        </Modal>
      )}

      {/* 알림 설정 모달 */}
      {mAlert && (
        <Modal onClose={() => setMAlert(false)}>
          <h3>알림 설정</h3>
          <p className="hint">기록 루틴과 공감 알림을 가볍게 정리해요.</p>
          <div className="row">
            <div>공감 알림</div>
            <div>
              <label className="tog">
                <input type="checkbox" checked={settings.emp} onChange={(e) => setSettings(prev => ({ ...prev, emp: e.target.checked }))} />
                <span className="tog-ball" />
              </label>
            </div>
          </div>
          <div className="row">
            <div>기록 루틴 시간</div>
            <div><input type="time" value={settings.time} onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value || '21:00' }))} className="input" /></div>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setMAlert(false)}>닫기</button>
            <button className="btn primary" onClick={onSaveAlert}>저장</button>
          </div>
        </Modal>
      )}

      {/* 앨범 모달 */}
      {mAlbum && (
        <Modal onClose={() => setMAlbum(false)}>
          <h3>감정꽃 앨범</h3>
          <p className="hint">100일 동안 자란 감정꽃을 한눈에 모아볼 수 있어요.</p>
          <div className="album" id="albumList">
            {album.map(it => (
              <div key={it.id} className="item" onClick={() => openFlower(it)}>
                <div className="flower">{it.emoji}</div>
              <div className="meta"><span>{it.title}</span></div>
              <div className="meta" style={{ fontWeight: 600 }}><span>{it.date}</span><span /></div>
              </div>
            ))}
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setMAlbum(false)}>닫기</button>
            <button className="btn primary" onClick={() => notify.info('꽃을 탭하면 상세 보기에서 저장/공유할 수 있어요', 'ℹ️')}>도움말</button>
          </div>
        </Modal>
      )}

      {/* 꽃 상세 모달 */}
      {mFlower && curFlower && (
        <Modal onClose={() => setMFlower(false)}>
          <div className="flower-modal-header">
            <h3 id="flowerTitle">꽃 상세</h3>
            <button
              type="button"
              className="flower-close-btn"
              onClick={() => setMFlower(false)}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <canvas ref={flowerCanvasRef} id="flowerCanvas" width={600} height={360} className="flower-canvas" />
          <div className="row"><div>개화 날짜</div><div id="flowerDate">{curFlower.date}</div></div>
          <div className="row">
            <div>한 줄 메시지</div>
            <div>
              <input
                value={flowerMessage}
                onChange={(e) => {
                  if (e.target.value.length > 15) return;
                  setFlowerMessage(e.target.value);
                }}
                placeholder="15자 이내로 입력"
                className="input"
              />
              <div className="ms-input-help" style={{ fontSize: 11, color: 'var(--ms-ink-muted)', marginTop: 4 }}>
                {flowerMessage.length} / 15자
              </div>
            </div>
          </div>
          <div className="grid2 flower-actions" style={{ marginTop: 10 }}>
            <button className="btn" onClick={saveFlowerMessage}>메시지 저장</button>
            <div className="grid2">
              <button className="btn" onClick={downloadFlower}>PNG 저장</button>
              <button className="btn" onClick={shareFlower}>공유하기</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 내보내기 모달 */}
      {mExport && (
        <Modal onClose={() => setMExport(false)}>
          <h3>감정기록 모아보기</h3>
          <p className="hint">
            마음씨에서 쌓인 기록을 한 번에 내려받을 수 있어요.
            {emotionsLoading ? ' 기록을 불러오는 중...' : ` 총 ${emotions.length}개의 기록이 있어요.`}
          </p>
          {emotions.length > 0 ? (
            <>
              <div className="grid2">
                <button className="btn" onClick={downloadJSON} disabled={emotionsLoading}>
                  JSON 내려받기
                </button>
                <button className="btn" onClick={downloadCSV} disabled={emotionsLoading}>
                  CSV 내려받기
                </button>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ms-ink-soft)' }}>
                <div>📝 전체 기록: {emotions.length}개</div>
                <div>🌍 공개 기록: {emotions.filter((e) => e.is_public).length}개</div>
                <div>🔒 비공개 기록: {emotions.filter((e) => !e.is_public).length}개</div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ms-ink-soft)' }}>
              {emotionsLoading ? '기록을 불러오는 중...' : '아직 기록이 없어요. 첫 번째 기록을 남겨볼까요?'}
            </div>
          )}
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setMExport(false)}>닫기</button>
          </div>
        </Modal>
      )}

      {/* 잠금 설정 모달 */}
      {mLock && (
        <Modal onClose={() => setMLock(false)}>
          <div className="lock-modal">
            <div className="lock-modal-header">
              <div>
                <h3>화면 잠금</h3>
                <p className="hint">당신의 감정을 안전하게 지켜드려요.</p>
              </div>
              <div className="lock-toggle-row">
                <div>
                  <div className="lock-toggle-title">화면 잠금 사용</div>
                  <div className="lock-toggle-desc">앱을 열 때 잠금 화면이 표시돼요.</div>
                </div>
                <label className="tog">
                  <input
                    type="checkbox"
                    checked={lockEnabledDraft}
                    onChange={(e) => setLockEnabledDraft(e.target.checked)}
                  />
                  <span className="tog-ball" />
                </label>
              </div>
            </div>

            <div className="lock-modal-body">
              {lockEnabledDraft && (
                <>
                  <div className="lock-mode-tabs">
                    <button
                      type="button"
                      className={`lock-mode-tab ${lockModeDraft === 'pattern' ? 'active' : ''}`}
                      onClick={() => {
                        setLockModeDraft('pattern');
                        setPatternError('');
                      }}
                    >
                      <span className="lock-mode-icon">🤲</span>
                      <div className="lock-mode-text">
                        <div className="title">마음을 감싸기</div>
                        <div className="desc">패턴으로 잠금</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`lock-mode-tab ${lockModeDraft === 'pin' ? 'active' : ''}`}
                      onClick={() => {
                        setLockModeDraft('pin');
                        setPinError('');
                      }}
                    >
                      <span className="lock-mode-icon">🔢</span>
                      <div className="lock-mode-text">
                        <div className="title">PIN (4자리)</div>
                        <div className="desc">숫자로 안전하게 보호</div>
                      </div>
                    </button>
                  </div>

                  {lockModeDraft === 'pattern' && (
                    <div className="lock-pattern-panel">
                      <div className="lock-pattern-grid">
                        {PATTERN_GRID.flat().map((point) => {
                          const index = patternDraft.indexOf(point);
                          return (
                            <button
                              key={point}
                              type="button"
                              className={`lock-pattern-node ${index >= 0 ? 'active' : ''}`}
                              onClick={() => handlePatternNode(point)}
                            >
                              {index >= 0 ? index + 1 : ''}
                            </button>
                          );
                        })}
                      </div>
                      <div className="lock-pattern-seq">
                        {patternDraft.length ? (
                          patternDraft.map((point, idx) => (
                            <span key={point} className="lock-seq-chip">
                              {idx + 1}
                            </span>
                          ))
                        ) : (
                          <span className="lock-pattern-placeholder">아직 선택된 패턴이 없어요.</span>
                        )}
                      </div>
                      {patternError && <div className="lock-error">{patternError}</div>}
                      <button type="button" className="lock-pattern-reset" onClick={resetPatternDraft}>
                        패턴 다시 그리기
                      </button>
                      <p className="lock-helper">최소 4개의 점을 순서대로 연결해 주세요.</p>
                    </div>
                  )}

                  {lockModeDraft === 'pin' && (
                    <div className="lock-pin-panel">
                      <div className="lock-pin-dots">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className={`lock-pin-dot ${i < pinDraft.length ? 'filled' : ''}`} />
                        ))}
                      </div>
                      <input
                        value={pinDraft}
                        onChange={(e) => handlePinDraftChange(e.target.value)}
                        maxLength={4}
                        className="input lock-pin-input"
                        placeholder="****"
                        inputMode="numeric"
                      />
                      {pinError && <div className="lock-error">{pinError}</div>}
                      <p className="lock-helper">숫자 4자리를 입력해 주세요.</p>
                    </div>
                  )}
                </>
              )}

              <div className="lock-info-box">
                <div className="lock-info-title">잠금 해제 안내</div>
                <div className="lock-info-text">
                  • 로그아웃 또는 앱 삭제 시 잠금 설정이 초기화돼요.
                  <br />• PIN/패턴을 잊어버리면 앱을 재설치해야 해요.
                </div>
              </div>
            </div>

            <div className="lock-modal-footer">
              <button type="button" className="lock-btn lock-btn-secondary" onClick={() => setMLock(false)}>
                닫기
              </button>
              <button
                type="button"
                className="lock-btn lock-btn-primary"
                disabled={!canSaveLock}
                onClick={handleLockSave}
              >
                저장
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 고객 문의 모달 */}
      {mSupport && (
        <Modal onClose={() => setMSupport(false)}>
          <h3>고객 문의</h3>
          <p className="hint">서비스 사용 중 궁금한 점이나 제안하고 싶은 점을 남겨주세요.</p>
          <div className="row">
            <div>이메일</div>
            <div><input className="input" value={qEmail} onChange={(e) => setQEmail(e.target.value)} placeholder="선택 (예: hello@maeumssi.app)" /></div>
          </div>
          <div className="row">
            <div>제목</div>
            <div><input className="input" value={qSubj} onChange={(e) => setQSubj(e.target.value)} placeholder="제목" /></div>
          </div>
          <div className="row">
            <div>내용</div>
            <div><textarea className="input" value={qBody} onChange={(e) => setQBody(e.target.value)} rows={5} placeholder="문의 내용을 적어주세요" /></div>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setMSupport(false)}>닫기</button>
            <button className="btn primary" onClick={sendSupport}>보내기</button>
          </div>
        </Modal>
      )}

    </Layout>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        {children}
      </div>
    </div>
  );
}


