import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { diag } from '@boot/diag';

type TodayRecordCTAProps = {
  todayLogged?: boolean; // 더미 props
  todayDate?: string; // 더미 props (ISO 형식)
};

export default function TodayRecordCTA({ todayLogged, todayDate }: TodayRecordCTAProps) {
  const navigate = useNavigate();
  const { isGuest, session } = useAuth();
  const notify = useNotify();

  // 더미 props가 없으면 실제 오늘 날짜 사용
  const targetDate = todayDate || new Date().toISOString().split('T')[0];
  const isLogged = todayLogged !== undefined ? todayLogged : false;
  const isGuestMode = isGuest || !session;

  const handleClick = () => {
    if (isGuestMode) {
      // 게스트 모드일 때 모달 표시
      notify.modal({
        title: '로그인/회원가입 후 이용하실 수 있어요!',
        message: '감정 기록을 남기려면 마음,씨에 가입하거나 로그인해주세요.',
        confirmLabel: '로그인 / 회원가입하기',
        cancelLabel: '닫기',
        onConfirm: () => {
          console.log('[TodayRecordCTA] go signup - 회원가입 페이지로 이동');
          diag.log('TodayRecordCTA: 회원가입 페이지로 이동', {
            path: '/signup',
            isGuest: isGuestMode,
          });
          navigate('/signup', { replace: true });
        },
        onCancel: () => {
          // 닫기 버튼 클릭 시 아무 동작 없음
        },
      });
      return;
    }
    navigate(`/record?date=${targetDate}`);
  };

  return (
    <button
      className="ms-btn ms-btn-primary"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 16px',
        height: 56,
        borderRadius: 18,
        border: '1px solid transparent',
        fontSize: 15,
        fontWeight: 600,
        width: '100%',
        margin: '24px 0',
        background: 'var(--ms-primary)',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: 'var(--ms-shadow-soft)',
        opacity: 1,
      }}
    >
      🌿 {isLogged ? '오늘의 감정 수정하기' : '오늘의 감정 기록하기'}
    </button>
  );
}
