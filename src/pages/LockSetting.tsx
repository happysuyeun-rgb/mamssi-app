import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@components/Layout';
import { lsGet, lsSet } from '@utils/storage';
import { createNotification } from '@services/notifications';
import { CURRENT_USER_ID } from '@constants/user';
import type { LockSettings, LockMode } from '@domain/lock';
import '@styles/page-hero.css';
import '@styles/lock.css';

const lockKey = 'ms_lock';
const lockSessionKey = 'ms_lock_session_unlocked';

export default function LockSetting() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<LockSettings>(
    lsGet<LockSettings>(lockKey, {
      enabled: false,
      mode: 'pattern',
      pattern: [],
      pin: '',
      biometricEnabled: false,
    })
  );

  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);

  // PIN 설정 모드 진입
  const startPinSetup = () => {
    setIsSettingPin(true);
    setPinInput('');
    setPinConfirm('');
    setPinError('');
    sessionStorage.removeItem(lockSessionKey);
  };

  // PIN 설정 완료
  const confirmPinSetup = () => {
    if (pinInput.length !== 4) {
      setPinError('4자리 숫자를 입력해주세요');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError('PIN이 일치하지 않아요');
      return;
    }
    const updated: LockSettings = {
      ...settings,
      mode: 'pin',
      pin: pinInput,
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
    if (!settings.createdAt) {
      updated.createdAt = new Date().toISOString();
    }
    sessionStorage.removeItem(lockSessionKey);
    setSettings(updated);
    lsSet(lockKey, updated);
    setIsSettingPin(false);
    setPinInput('');
    setPinConfirm('');
    createNotification(CURRENT_USER_ID, 'pin_enabled', { mode: 'pin' }).catch(() => {});
    navigate('/mypage');
  };

  // 잠금 해제
  const disableLock = () => {
    sessionStorage.removeItem(lockSessionKey);
    const updated: LockSettings = {
      ...settings,
      enabled: false,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    lsSet(lockKey, updated);
    createNotification(CURRENT_USER_ID, 'pin_disabled', {}).catch(() => {});
  };

  // PIN 재설정
  const resetPin = () => {
    startPinSetup();
  };

  // 생체인증 토글
  const toggleBiometric = (enabled: boolean) => {
    const updated: LockSettings = {
      ...settings,
      biometricEnabled: enabled,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    lsSet(lockKey, updated);
  };

  // 잠금 방식 변경
  const changeMode = (mode: LockMode) => {
    if (mode === 'pin' && !settings.pin) {
      startPinSetup();
    } else {
      const updated: LockSettings = {
        ...settings,
        mode,
        updatedAt: new Date().toISOString(),
      };
      setSettings(updated);
      lsSet(lockKey, updated);
    }
  };

  return (
    <Layout hideHeader>
      <div className="lock-setting-page">
        <div className="page-hero">
          <div className="page-hero-icon" aria-hidden="true">
            🔐
          </div>
          <div>
            <h1 className="page-hero-title">화면 잠금 설정</h1>
            <p className="page-hero-desc">당신의 감정을 안전하게 지켜드려요.</p>
          </div>
        </div>

        {/* PIN 설정 모드 */}
        {isSettingPin ? (
          <div className="lock-pin-setup">
            <h2 className="lock-section-title">PIN 설정</h2>
            <p className="lock-section-desc">4자리 숫자로 PIN을 설정해주세요.</p>

            <div className="lock-pin-input-section">
              <div className="lock-pin-step">
                <div className="lock-pin-label">PIN 입력</div>
                <div className="lock-pin-dots">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`lock-pin-dot ${i < pinInput.length ? 'filled' : ''}`}
                    />
                  ))}
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPinInput(val);
                    setPinError('');
                  }}
                  className="lock-pin-hidden-input"
                  autoFocus
                />
              </div>

              {pinInput.length === 4 && (
                <div className="lock-pin-step">
                  <div className="lock-pin-label">PIN 확인</div>
                  <div className="lock-pin-dots">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`lock-pin-dot ${i < pinConfirm.length ? 'filled' : ''}`}
                      />
                    ))}
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPinConfirm(val);
                      setPinError('');
                    }}
                    className="lock-pin-hidden-input"
                    autoFocus={pinInput.length === 4}
                  />
                </div>
              )}

              {pinError && <div className="lock-pin-error">{pinError}</div>}
            </div>

            <div className="lock-pin-actions">
              <button
                type="button"
                className="lock-btn lock-btn-secondary"
                onClick={() => {
                  setIsSettingPin(false);
                  setPinInput('');
                  setPinConfirm('');
                  setPinError('');
                }}
              >
                취소
              </button>
              {pinInput.length === 4 && pinConfirm.length === 4 && (
                <button
                  type="button"
                  className="lock-btn lock-btn-primary"
                  onClick={confirmPinSetup}
                >
                  완료
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* 잠금 사용 토글 */}
            <section className="lock-section">
              <div className="lock-toggle-row">
                <div>
                  <div className="lock-toggle-title">화면 잠금 사용</div>
                  <div className="lock-toggle-desc">앱을 열 때 잠금 화면이 표시돼요.</div>
                </div>
                <label className="lock-switch">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!settings.pin) {
                          startPinSetup();
                        } else {
                          const updated: LockSettings = {
                            ...settings,
                            enabled: true,
                            updatedAt: new Date().toISOString(),
                          };
                          setSettings(updated);
                          lsSet(lockKey, updated);
                        }
                      } else {
                        disableLock();
                      }
                    }}
                  />
                  <span className="lock-switch-slider" />
                </label>
              </div>
            </section>

            {settings.enabled && (
              <>
                {/* 잠금 방식 선택 (마음을 감싸기 숨김) */}
                <section className="lock-section">
                  <div className="lock-section-title">잠금 방식</div>
                  <div className="lock-mode-options">
                    <label className="lock-mode-option">
                      <input
                        type="radio"
                        name="lockMode"
                        value="pin"
                        checked={settings.mode === 'pin' || settings.mode === 'pattern'}
                        onChange={() => changeMode('pin')}
                      />
                      <div className="lock-mode-content">
                        <div className="lock-mode-icon">🔢</div>
                        <div className="lock-mode-label">PIN (4자리)</div>
                        <div className="lock-mode-desc">숫자로 안전하게 보호</div>
                      </div>
                    </label>
                  </div>

                  {(settings.mode === 'pin' && settings.pin && (
                    <button type="button" className="lock-btn-link" onClick={resetPin}>
                      PIN 재설정
                    </button>
                  )) ||
                    (settings.mode === 'pattern' && (
                      <button type="button" className="lock-btn-link" onClick={startPinSetup}>
                        PIN으로 전환
                      </button>
                    ))}
                </section>

                {/* 생체인증 (PIN 모드일 때만) */}
                {settings.mode === 'pin' && (
                  <section className="lock-section">
                    <div className="lock-toggle-row">
                      <div>
                        <div className="lock-toggle-title">생체인증 사용</div>
                        <div className="lock-toggle-desc">지문 또는 Face ID로 빠르게 잠금 해제</div>
                      </div>
                      <label className="lock-switch">
                        <input
                          type="checkbox"
                          checked={settings.biometricEnabled}
                          onChange={(e) => toggleBiometric(e.target.checked)}
                        />
                        <span className="lock-switch-slider" />
                      </label>
                    </div>
                  </section>
                )}

                {/* 안내 문구 */}
                <section className="lock-section">
                  <div className="lock-info-box">
                    <div className="lock-info-title">💡 잠금 해제 방법</div>
                    <div className="lock-info-text">
                      • 로그아웃 또는 앱 삭제 시 잠금 설정이 초기화돼요.
                      <br />• PIN을 잊어버리면 앱을 재설치해야 해요.
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* 닫기 버튼 */}
        <div className="lock-actions">
          <button
            type="button"
            className="lock-btn lock-btn-secondary"
            onClick={() => navigate('/mypage')}
          >
            닫기
          </button>
        </div>
      </div>
    </Layout>
  );
}
