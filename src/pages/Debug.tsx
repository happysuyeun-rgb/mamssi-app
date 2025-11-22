import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { safeStorage } from '@lib/safeStorage';
import { diag } from '@boot/diag';
import Layout from '@components/Layout';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';
const GUEST_MODE_KEY = 'isGuest';

export default function Debug() {
  const navigate = useNavigate();
  const { user, session, loading, sessionInitialized, isGuest } = useAuth();
  const [storageTest, setStorageTest] = useState(safeStorage.test());
  const [envStatus, setEnvStatus] = useState({
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  });

  useEffect(() => {
    diag.log('Debug: 페이지 진입');
  }, []);

  const refreshStorage = () => {
    setStorageTest(safeStorage.test());
  };

  const handleSetGuest = () => {
    safeStorage.setItem(GUEST_MODE_KEY, 'true');
    safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    diag.log('Debug: 게스트 모드 설정');
    refreshStorage();
  };

  const handleClearGuest = () => {
    safeStorage.removeItem(GUEST_MODE_KEY);
    diag.log('Debug: 게스트 모드 해제');
    refreshStorage();
  };

  const handleSetOnboarding = () => {
    safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    diag.log('Debug: 온보딩 완료 설정');
    refreshStorage();
  };

  const handleClearOnboarding = () => {
    safeStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    diag.log('Debug: 온보딩 완료 해제');
    refreshStorage();
  };

  const handleClearAll = () => {
    safeStorage.removeItem(GUEST_MODE_KEY);
    safeStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    diag.log('Debug: 모든 플래그 초기화');
    refreshStorage();
  };

  const onboardingComplete = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  const guestMode = safeStorage.getItem(GUEST_MODE_KEY) === 'true';

  return (
    <Layout hideHeader>
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>🔍 마음씨 디버그 페이지</h1>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>환경변수 (ENV)</h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'var(--ms-surface)',
              borderRadius: 12,
              overflow: 'hidden'
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  VITE_SUPABASE_URL
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {envStatus.hasUrl ? '✅ 설정됨' : '❌ 미설정'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  VITE_SUPABASE_ANON_KEY
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {envStatus.hasKey ? '✅ 설정됨' : '❌ 미설정'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>인증 상태</h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'var(--ms-surface)',
              borderRadius: 12,
              overflow: 'hidden'
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  로딩 중
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {loading ? '⏳ 예' : '✅ 완료'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  세션 초기화
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {sessionInitialized ? '✅ 완료' : '⏳ 대기 중'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  세션 존재
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {session ? '✅ 있음' : '❌ 없음'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  사용자 ID
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontFamily: 'monospace', fontSize: 12 }}>
                  {user?.id || '-'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  게스트 모드
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {isGuest ? '✅ 활성' : '❌ 비활성'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>스토리지 상태</h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'var(--ms-surface)',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 12
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  Storage 타입
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {storageTest.available ? '✅ localStorage' : '⚠️ 메모리'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  게스트 모드 플래그
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {guestMode ? '✅ true' : '❌ false'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)', fontWeight: 600 }}>
                  온보딩 완료 플래그
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid var(--ms-line)' }}>
                  {onboardingComplete ? '✅ true' : '❌ false'}
                </td>
              </tr>
            </tbody>
          </table>
          <button
            onClick={refreshStorage}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--ms-line)',
              background: 'var(--ms-surface)',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            🔄 스토리지 새로고침
          </button>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>현재 경로</h2>
          <div
            style={{
              padding: '12px',
              background: 'var(--ms-surface)',
              borderRadius: 12,
              fontFamily: 'monospace',
              fontSize: 14
            }}
          >
            {window.location.pathname}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>액션</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={handleSetGuest}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: 'var(--ms-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              게스트 모드 설정
            </button>
            <button
              onClick={handleClearGuest}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: 'var(--ms-surface)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              게스트 모드 해제
            </button>
            <button
              onClick={handleSetOnboarding}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: 'var(--ms-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              온보딩 완료 설정
            </button>
            <button
              onClick={handleClearOnboarding}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: 'var(--ms-surface)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              온보딩 완료 해제
            </button>
            <button
              onClick={handleClearAll}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #ef4444',
                background: '#fff5f5',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              모든 플래그 초기화
            </button>
            <button
              onClick={() => navigate('/', { replace: true })}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: 'var(--ms-surface)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              홈으로 이동
            </button>
            <button
              onClick={() => navigate('/onboarding', { replace: true })}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--ms-line)',
                background: 'var(--ms-surface)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              온보딩으로 이동
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}


