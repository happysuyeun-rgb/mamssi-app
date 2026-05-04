import { useEffect, useState, useCallback } from 'react';
import { loadLockSettings } from '@utils/lock';
import type { LockSettings } from '@domain/lock';
import '@styles/lock.css';

const PIN_LEN = 4;

const KEYPAD_ROWS: (string | 'delete' | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'delete'],
];

type LockScreenProps = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [settings, setSettings] = useState<LockSettings | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    const lock = loadLockSettings();
    setSettings(lock);
  }, []);

  const handleUnlockSuccess = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setIsUnlocking(true);
    setTimeout(() => onUnlock(), 200);
  }, [onUnlock]);

  const tryCompletePin = useCallback(
    (next: string) => {
      if (next.length !== PIN_LEN || !settings?.pin) return;
      if (next === settings.pin) {
        handleUnlockSuccess();
      } else {
        setPinError('PIN이 맞지 않아요');
        setPinInput('');
        if (navigator.vibrate) {
          navigator.vibrate([80, 50, 80]);
        }
      }
    },
    [settings, handleUnlockSuccess],
  );

  const appendDigit = (digit: string) => {
    if (isUnlocking || pinInput.length >= PIN_LEN) return;
    const next = pinInput + digit;
    setPinInput(next);
    setPinError('');
    tryCompletePin(next);
  };

  const deleteDigit = () => {
    if (isUnlocking) return;
    setPinInput((p) => p.slice(0, -1));
    setPinError('');
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
      <div className="lock-screen-scroll">
        <div className="lock-screen-content">
          <div className="lock-screen-icon">🔐</div>
          <div className="lock-screen-title">화면 잠금</div>
          <div className="lock-screen-desc">PIN을 입력해주세요</div>

          <div
            className="lock-pin-dots"
            role="img"
            aria-label={`PIN ${pinInput.length}자리 입력됨`}
          >
            {Array.from({ length: PIN_LEN }, (_, i) => (
              <div
                key={i}
                className={`lock-pin-dot ${i < pinInput.length ? 'filled' : ''} ${pinError ? 'error' : ''}`}
              />
            ))}
          </div>

          {pinError && (
            <div className="lock-pin-error" role="alert">
              {pinError}
            </div>
          )}

          <input
            type="text"
            name="lock-pin-display"
            readOnly
            tabIndex={-1}
            inputMode="none"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-hidden="true"
            value={pinInput}
            maxLength={PIN_LEN}
            className="lock-pin-readonly-input"
            disabled={isUnlocking}
            onFocus={(e) => e.currentTarget.blur()}
          />

          {settings.biometricEnabled && (
            <button type="button" className="lock-biometric-btn" onClick={handleBiometric}>
              👆 생체인증으로 해제
            </button>
          )}
        </div>
      </div>

      <div className="lock-screen-keypad" role="group" aria-label="PIN 숫자 키패드">
        {KEYPAD_ROWS.map((row, ri) => (
          <div key={ri} className="lock-screen-keypad-row">
            {row.map((cell, ci) => {
              if (cell === null) {
                return <span key={`e-${ri}-${ci}`} className="lock-screen-keypad-spacer" aria-hidden />;
              }
              if (cell === 'delete') {
                return (
                  <button
                    key="del"
                    type="button"
                    className="lock-screen-keypad-btn lock-screen-keypad-btn-delete"
                    onClick={deleteDigit}
                    disabled={isUnlocking || pinInput.length === 0}
                    aria-label="한 자리 삭제"
                  >
                    삭제
                  </button>
                );
              }
              return (
                <button
                  key={cell}
                  type="button"
                  className="lock-screen-keypad-btn"
                  onClick={() => appendDigit(cell)}
                  disabled={isUnlocking || pinInput.length >= PIN_LEN}
                  aria-label={`숫자 ${cell}`}
                >
                  {cell}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
