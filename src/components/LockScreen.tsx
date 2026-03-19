import { useEffect, useState, useRef } from 'react';
import { loadLockSettings } from '@utils/lock';
import type { LockSettings } from '@domain/lock';
import '@styles/lock.css';

type LockScreenProps = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [settings, setSettings] = useState<LockSettings | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lock = loadLockSettings();
    setSettings(lock);
  }, []);

  useEffect(() => {
    if (settings?.enabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [settings]);

  const handleUnlockSuccess = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setIsUnlocking(true);
    setTimeout(() => onUnlock(), 200);
  };

  const handlePinInput = (value: string) => {
    const numValue = value.replace(/\D/g, '').slice(0, 4);
    setPinInput(numValue);
    setPinError('');

    if (numValue.length === 4 && settings?.pin) {
      if (numValue === settings.pin) {
        handleUnlockSuccess();
      } else {
        setPinError('PIN이 맞지 않아요');
        setPinInput('');
        if (navigator.vibrate) {
          navigator.vibrate([80, 50, 80]);
        }
        setTimeout(() => inputRef.current?.focus(), 120);
      }
    }
  };

  const handleBiometric = () => {
    if (!settings?.biometricEnabled) return;
    setPinError('생체인증은 모바일 앱에서 지원됩니다.');
  };

  if (!settings || !settings.enabled) {
    return null;
  }

  return (
    <div className="lock-screen lock-screen-pin">
      <div className="lock-screen-content">
        <div className="lock-screen-icon">🔐</div>
        <div className="lock-screen-title">화면 잠금</div>
        <div className="lock-screen-desc">PIN을 입력해주세요</div>

        <div className="lock-pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`lock-pin-dot ${i < pinInput.length ? 'filled' : ''} ${pinError ? 'error' : ''}`}
            />
          ))}
        </div>

        {pinError && <div className="lock-pin-error">{pinError}</div>}

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinInput}
          onChange={(e) => handlePinInput(e.target.value)}
          className="lock-pin-hidden-input"
          autoFocus
          disabled={isUnlocking}
        />

        {settings.biometricEnabled && (
          <button type="button" className="lock-biometric-btn" onClick={handleBiometric}>
            👆 생체인증으로 해제
          </button>
        )}
      </div>
    </div>
  );
}
