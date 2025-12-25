import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { supabase } from '@lib/supabaseClient';
import { diag } from '@boot/diag';
import './DeleteAccountPage.css';

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const notify = useNotify();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const reasons = [
    { id: 'not_using', label: '사용하지 않아요' },
    { id: 'privacy', label: '개인정보 보호가 걱정돼요' },
    { id: 'features', label: '원하는 기능이 없어요' },
    { id: 'difficult', label: '사용하기 어려워요' },
    { id: 'other', label: '기타' }
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!isConfirmed || !user) {
      notify.warning('탈퇴 확인을 체크해주세요.', '⚠️');
      return;
    }

    if (!confirm('정말 회원탈퇴를 진행하시겠어요? 이 작업은 되돌릴 수 없어요.')) {
      return;
    }

    setIsDeleting(true);
    diag.log('DeleteAccountPage: 회원탈퇴 시작', { userId: user.id });

    try {
      // users 테이블에서 soft delete 처리
      // is_deleted=true, deleted_at=now(), onboarding_completed=false
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          onboarding_completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        diag.err('DeleteAccountPage: users 테이블 soft delete 실패', updateError);
        throw updateError;
      }

      diag.log('DeleteAccountPage: users 테이블 soft delete 완료');

      diag.log('DeleteAccountPage: 회원탈퇴 완료');
      notify.success('회원탈퇴가 완료되었어요. 이용해 주셔서 감사합니다.', '👋');
      
      // 로그아웃 처리
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      diag.err('DeleteAccountPage: 회원탈퇴 실패', error);
      notify.error('회원탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-account-page">
      <div className="delete-account-header">
        <button
          className="delete-account-back"
          onClick={handleBack}
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="delete-account-title">회원탈퇴</h1>
      </div>

      <div className="delete-account-content">
        <div className="delete-account-hero">
          <div className="delete-account-icon">🌿</div>
          <h2 className="delete-account-hero-title">정말 떠나시나요?</h2>
          <p className="delete-account-hero-desc">
            탈퇴하시면 모든 감정 기록과 데이터가 삭제되며, 복구할 수 없어요.
          </p>
        </div>

        <div className="delete-account-reasons">
          <h3 className="delete-account-reasons-title">탈퇴 사유를 알려주세요</h3>
          <div className="delete-account-reasons-list">
            {reasons.map((reason) => (
              <label
                key={reason.id}
                className="delete-account-reason-item"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={(e) => {
                    setSelectedReason(e.target.value);
                    if (e.target.value !== 'other') {
                      setOtherReason('');
                    }
                  }}
                />
                <span>{reason.label}</span>
              </label>
            ))}
          </div>
          {selectedReason === 'other' && (
            <input
              type="text"
              className="delete-account-other-input"
              placeholder="사유를 입력해주세요"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              maxLength={200}
            />
          )}
        </div>

        <div className="delete-account-confirm">
          <label className="delete-account-confirm-item">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
            />
            <span>위 내용을 확인했으며, 회원탈퇴에 동의합니다.</span>
          </label>
        </div>

        <div className="delete-account-actions">
          <button
            className="delete-account-btn delete-account-btn-cancel"
            onClick={handleBack}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            className="delete-account-btn delete-account-btn-delete"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? '탈퇴 처리 중...' : '회원탈퇴'}
          </button>
        </div>
      </div>
    </div>
  );
}

