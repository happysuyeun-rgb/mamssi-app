import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { useSettings } from '@hooks/useSettings';
import SimpleCard from '@components/cards/SimpleCard';
import { supabase } from '@lib/supabaseClient';
import { diag } from '@boot/diag';

export default function MyPage() {
  const navigate = useNavigate();
  const { user, session, signOut } = useAuth();
  const notify = useNotify();
  const { settings: dbSettings } = useSettings(user?.id || null);

  // 소셜 제공자 이름 변환
  const getProviderName = (provider?: string): string => {
    if (!provider) return '알 수 없음';
    const providerMap: Record<string, string> = {
      google: 'Google',
      apple: 'Apple',
      kakao: 'Kakao',
      facebook: 'Facebook',
      line: 'LINE',
    };
    return providerMap[provider] || provider;
  };

  // 로그아웃 처리
  const handleSignOut = async () => {
    if (!confirm('정말 로그아웃하시겠어요?')) return;

    try {
      diag.log('MyPage: 로그아웃 시작');
      await signOut();
      diag.log('MyPage: 로그아웃 완료, /login으로 이동');
      navigate('/login', { replace: true });
    } catch (error) {
      diag.err('MyPage: 로그아웃 실패', error);
      notify.error('로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };

  // 소셜 계정 관리 (placeholder)
  const handleSocialAccountManage = () => {
    notify.info('소셜 계정 관리는 준비 중이에요.', 'ℹ️');
  };

  // 회원탈퇴 페이지로 이동
  const handleDeleteAccount = () => {
    navigate('/delete-account');
  };

  // 로그인 상태 확인
  const isLoggedIn = !!user && !!session;

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      {/* 계정 정보 섹션 */}
      {isLoggedIn && (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--ms-line)',
            borderRadius: 16,
            padding: '18px 16px',
            boxShadow: 'var(--ms-shadow-soft)',
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 16,
              color: 'var(--ms-text-main)',
            }}
          >
            계정 정보
          </div>

          {/* 내 프로필 */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10,
                color: 'var(--ms-ink-soft)',
              }}
            >
              내 프로필
            </div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ms-ink-muted)' }}>사용자 ID</span>
                <span
                  style={{ color: 'var(--ms-ink-soft)', fontFamily: 'monospace', fontSize: 12 }}
                >
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
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10,
                color: 'var(--ms-ink-soft)',
              }}
            >
              로그인 정보
            </div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ms-ink-muted)' }}>소셜 제공자</span>
                <span style={{ color: 'var(--ms-ink-soft)' }}>
                  {getProviderName(session?.user.app_metadata?.provider)}
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
                  onClick={handleSocialAccountManage}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--ms-line)',
                    background: '#fff',
                    color: 'var(--ms-ink-soft)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  소셜 계정 관리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 설정 메뉴 */}
      <SimpleCard
        title="프로필 설정"
        description="닉네임, MBTI, 프로필 사진 · 기본 이모티콘 설정"
      />
      <SimpleCard title="알림 설정" />
      <SimpleCard title="감정꽃 앨범" />
      <SimpleCard title="감정기록 모아보기" />
      <SimpleCard title="화면 잠금" />

      {/* 로그아웃 버튼 */}
      {isLoggedIn && <SimpleCard title="로그아웃" onClick={handleSignOut} />}

      {/* 회원탈퇴 버튼 (로그인 상태에서만 표시) */}
      {isLoggedIn && <SimpleCard title="회원탈퇴" onClick={handleDeleteAccount} />}
    </section>
  );
}
