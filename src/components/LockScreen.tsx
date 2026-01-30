import { useEffect, useState, useRef } from 'react';
import { loadLockSettings } from '@utils/lock';
import type { LockSettings } from '@domain/lock';
import '@styles/lock.css';

type LockScreenProps = {
  onUnlock: () => void;
};

const PATTERN_GRID = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [settings, setSettings] = useState<LockSettings | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [patternInput, setPatternInput] = useState<number[]>([]);
  const [patternError, setPatternError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lock = loadLockSettings();
    setSettings(lock);
  }, []);

  useEffect(() => {
    if (settings?.mode === 'pin' && settings.enabled) {
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
    alert('생체인증은 모바일 앱에서 지원됩니다.');
  };

  const handlePatternSelect = (point: number) => {
    setPatternError('');
    setPatternInput((prev) => {
      if (!prev.length) return [point];
      if (prev[prev.length - 1] === point) {
        return prev.slice(0, -1);
      }
      if (prev.includes(point)) return prev;
      return [...prev, point];
    });
  };

  const handlePatternReset = () => {
    setPatternInput([]);
    setPatternError('');
  };

  const handlePatternSubmit = () => {
    if (!settings?.pattern?.length) {
      handleUnlockSuccess();
      return;
    }
    if (patternInput.length !== settings.pattern.length) {
      setPatternError('등록된 패턴과 다른 길이예요. 다시 시도해 주세요.');
      handlePatternReset();
      return;
    }
    const matches = settings.pattern.every((point, index) => point === patternInput[index]);
    if (matches) {
      handleUnlockSuccess();
    } else {
      setPatternError('패턴이 일치하지 않아요.');
      handlePatternReset();
      if (navigator.vibrate) {
        navigator.vibrate([80, 50, 80]);
      }
    }
  };

  if (!settings || !settings.enabled) {
    return null;
  }

  if (settings.mode === 'pattern') {
    return (
      <div className="lock-screen lock-screen-pattern">
        <div className="lock-screen-content">
          <div className="lock-screen-icon">🤲</div>
          <div className="lock-screen-title">마음을 감싸기</div>
          <div className="lock-screen-desc">등록한 패턴을 다시 연결해 주세요.</div>

          <div className="lock-pattern-grid">
            {PATTERN_GRID.map((row) =>
              row.map((point) => {
                const index = patternInput.indexOf(point);
                return (
                  <button
                    key={point}
                    type="button"
                    className={`lock-pattern-node ${index >= 0 ? 'active' : ''}`}
                    onClick={() => handlePatternSelect(point)}
                  >
                    {index >= 0 ? index + 1 : ''}
                  </button>
                );
              })
            )}
          </div>

          {patternError && <div className="lock-pin-error">{patternError}</div>}

          <div className="lock-pattern-actions">
            <button
              type="button"
              className="lock-btn lock-btn-secondary"
              onClick={handlePatternReset}
            >
              지우기
            </button>
            <button
              type="button"
              className="lock-btn lock-btn-primary"
              disabled={patternInput.length < 1 || isUnlocking}
              onClick={handlePatternSubmit}
            >
              해제하기
            </button>
          </div>
        </div>
      </div>
    );
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
