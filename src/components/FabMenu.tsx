import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActionGuard } from '@hooks/useActionGuard';

type FabMenuProps = {
  className?: string;
};

export default function FabMenu({ className }: FabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { requireAuthForAction } = useActionGuard();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleWriteClick = () => {
    requireAuthForAction(
      'write_post',
      () => {
        handleNavigate('/record');
      },
      {
        customMessage: '감정 기록을 남기려면 로그인 또는 가입이 필요해요.'
      }
    );
  };

  return (
    <div
      ref={containerRef}
      className={`fab-menu ${isOpen ? 'open' : ''} ${className ?? ''}`.trim()}
      aria-expanded={isOpen}
    >
      <div className="fab-actions">
        <button
          type="button"
          className="fab-action-btn"
          style={{ '--fab-order': 2 } as React.CSSProperties}
          onClick={() => handleNavigate('/forest/my-posts')}
          aria-label="내가 쓴 글 보기"
        >
          <span className="fab-action-icon" aria-hidden="true">
            👤
          </span>
          <span className="fab-action-label">내가 쓴 글</span>
        </button>

        <button
          type="button"
          className="fab-action-btn"
          style={{ '--fab-order': 1 } as React.CSSProperties}
          onClick={handleWriteClick}
          aria-label="글 작성하기"
        >
          <span className="fab-action-icon" aria-hidden="true">
            ✏️
          </span>
          <span className="fab-action-label">감정 기록</span>
        </button>
      </div>

      <button
        type="button"
        className={`fab-main ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        <span aria-hidden="true">✏️</span>
      </button>
    </div>
  );
}


