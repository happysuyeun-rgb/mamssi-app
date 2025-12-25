import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useNotify } from '@providers/NotifyProvider';
import { safeStorage } from '@lib/safeStorage';
import { diag } from '@boot/diag';
import SignupOnboardingStep, { type SocialProvider } from './steps/SignupOnboardingStep';
import '@styles/onboarding.css';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';
const GUEST_MODE_KEY = 'isGuest';

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function OnboardingGuest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, loading, isGuest, signInWithGoogle, signInWithApple, signInWithKakao, setGuestMode, refreshUserProfile } = useAuth();
  const notify = useNotify();
  
  const [step, setStep] = useState<OnboardingStep>(0);
  const [seedName, setSeedName] = useState('');
  const [seedError, setSeedError] = useState(false);
  const [finalCopy, setFinalCopy] = useState('방금 심은 씨앗이 오늘부터 조용히 자라요.');

  // URL 쿼리 파라미터에서 step 읽기 및 업데이트 (회원가입 페이지로 직접 이동 시)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    console.log('[OnboardingGuest] URL 파라미터 확인', { 
      stepParam, 
      currentStep: step,
      search: window.location.search,
      hash: window.location.hash,
      pathname: window.location.pathname
    });
    diag.log('OnboardingGuest: URL 파라미터 확인', { 
      stepParam, 
      currentStep: step,
      search: window.location.search,
      hash: window.location.hash
    });
    
    if (stepParam) {
      const stepValue = parseInt(stepParam, 10) as OnboardingStep;
      console.log('[OnboardingGuest] step 파라미터 파싱', { stepParam, stepValue, isValid: !isNaN(stepValue) && stepValue >= 0 && stepValue <= 7 });
      if (!isNaN(stepValue) && stepValue >= 0 && stepValue <= 7) {
        if (stepValue !== step) {
          console.log('[OnboardingGuest] step 변경', { from: step, to: stepValue });
          diag.log('OnboardingGuest: step 파라미터로 step 변경', { 
            from: step, 
            to: stepValue 
          });
          setStep(stepValue);
        } else {
          console.log('[OnboardingGuest] step 이미 동일', { step });
        }
      } else {
        console.warn('[OnboardingGuest] 유효하지 않은 step 값', { stepParam, stepValue });
      }
    } else {
      console.log('[OnboardingGuest] step 파라미터 없음');
    }
  }, [searchParams, step]);

  // 로그인 상태이고 온보딩 완료 시 홈으로 리다이렉트
  // 단, step 파라미터가 있으면 회원가입을 위해 온보딩 페이지 접근 허용
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (!loading && session && user && !stepParam) {
      const onboardingComplete = safeStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
      if (onboardingComplete) {
        diag.log('OnboardingGuest: 로그인 상태 + 온보딩 완료, 홈으로 리다이렉트 (step 파라미터 없음)');
        navigate('/', { replace: true });
      }
    }
  }, [loading, session, user, navigate, searchParams]);

  const showStep = (s: OnboardingStep) => {
    setStep(s);
  };

  // Step 0: 시작화면
  const handleStart = () => {
    showStep(1);
  };

  // Step 1-3: 이전/다음
  const handlePrev = () => {
    // Step 4(회원가입)에서 step 파라미터로 직접 온 경우 홈으로 이동
    const stepParam = searchParams.get('step');
    if (step === 4 && stepParam === '4') {
      console.log('[OnboardingGuest] Step 4에서 이전 버튼 클릭, 홈으로 이동');
      diag.log('OnboardingGuest: Step 4에서 이전 버튼 클릭, 홈으로 이동');
      navigate('/', { replace: true });
      return;
    }
    
    // 일반 온보딩 플로우에서는 이전 step으로 이동
    if (step > 0) {
      showStep((step - 1) as OnboardingStep);
    }
  };

  const handleNext = () => {
    if (step < 7) {
      showStep((step + 1) as OnboardingStep);
    }
  };

  // Step 3: 둘러보기 또는 회원가입
  const handleBrowse = () => {
    diag.log('OnboardingGuest: handleBrowse 호출');
    // safeStorage로 확실히 기록
    safeStorage.setItem(GUEST_MODE_KEY, 'true');
    safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    diag.log('OnboardingGuest: 게스트 모드 플래그 저장 완료', {
      guestMode: safeStorage.getItem(GUEST_MODE_KEY),
      onboardingComplete: safeStorage.getItem(ONBOARDING_COMPLETE_KEY)
    });
    
    // 상태 업데이트
    setGuestMode(true);
    
    // replace로 이동 (히스토리 스택에 추가하지 않음)
    notify.success('온보딩이 완료되었어요 🌱');
    diag.log('OnboardingGuest: 홈으로 리다이렉트');
    navigate('/home', { replace: true });
    // 홈 화면에서 배너가 표시됨
  };

  const handleJoin = () => {
    showStep(4);
  };

  // Step 4: 회원가입
  const handleSocialLogin = async (provider: SocialProvider) => {
    diag.log(`OnboardingGuest: ${provider} 로그인 시도`);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      } else if (provider === 'kakao') {
        await signInWithKakao();
      } else if (provider === 'facebook' || provider === 'line') {
        // Facebook과 LINE은 아직 구현되지 않음
        notify.info(`${provider === 'facebook' ? 'Facebook' : 'LINE'} 로그인은 준비 중이에요.`, 'ℹ️');
        return;
      }
      // OAuth는 리다이렉트되므로 여기서는 처리하지 않음
      // AuthCallback에서 온보딩 완료 플래그 설정 후 /home으로 리다이렉트됨
    } catch (error) {
      diag.err('OnboardingGuest: 로그인 실패:', error);
      notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');
    }
  };


  // Step 5: 씨앗 받기
  // Step 6: 씨앗 이름 짓기
  const validateSeedName = (name: string): boolean => {
    return /^[ㄱ-ㅎ가-힣a-zA-Z0-9]{1,12}$/.test(name.trim());
  };

  const handleSeedNameChange = (value: string) => {
    // 입력값을 즉시 state에 반영
    setSeedName(value);
    // 에러가 표시된 상태에서 유효한 값이 입력되면 에러 해제
    if (seedError) {
      setSeedError(!validateSeedName(value));
    }
  };

  const handleStep6Next = () => {
    const trimmed = seedName.trim();
    if (!validateSeedName(trimmed)) {
      setSeedError(true);
      return;
    }
    setSeedError(false);
    setFinalCopy(`방금 심은 "${trimmed}" 씨앗이 오늘부터 조용히 자라요.`);
    showStep(7);
  };

  // Step 7: 완료
  const handleGoHome = async () => {
    diag.log('OnboardingGuest: handleGoHome 호출');
    // safeStorage로 확실히 기록 (게스트 모드용)
    safeStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    diag.log('OnboardingGuest: 온보딩 완료 플래그 저장', {
      onboardingComplete: safeStorage.getItem(ONBOARDING_COMPLETE_KEY)
    });
    
    // 게스트 모드가 아니면 해제
    if (!isGuest) {
      safeStorage.removeItem(GUEST_MODE_KEY);
    }
    
    // 로그인 상태면 users 테이블에 온보딩 완료 상태 저장
    if (session && user) {
      try {
        diag.log('OnboardingGuest: users 테이블 업데이트 시작');
        const { supabase } = await import('@lib/supabaseClient');
        const { error } = await supabase
          .from('users')
          .update({ 
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (error) {
          diag.err('OnboardingGuest: users 테이블 업데이트 실패:', error);
        } else {
          diag.log('OnboardingGuest: users 테이블 업데이트 완료');
          // userProfile 갱신
          await refreshUserProfile();
        }
      } catch (error) {
        diag.err('OnboardingGuest: users 테이블 업데이트 중 오류:', error);
      }
    }
    
    notify.success('온보딩이 완료되었어요 🌱');
    diag.log('OnboardingGuest: 홈으로 리다이렉트');
    navigate('/home', { replace: true });
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-app">
        <header className="onboarding-brand">
          <div className="onboarding-logo">🌱</div>
          <div>
            <div className="onboarding-brand-title">마음, 씨</div>
            <div className="onboarding-brand-sub">감정을 기록하고, 공감으로 키우는 정원</div>
          </div>
        </header>

        <main className="onboarding-card">
          {/* Step 0: 시작화면 */}
          <section className={`onboarding-panel ${step !== 0 ? 'hidden' : ''}`} data-step="0">
            <div className="onboarding-eyebrow">마음, 씨 시작하기</div>
            <h1>감정을 심고{'\n'}나를 키우다.</h1>
            <p className="onboarding-desc">하루의 감정을 씨앗으로 기록하면, 내 정원에 작은 변화가 시작돼요.</p>
            <div className="onboarding-tags">
              <span className="onboarding-tag">#감정기록</span>
              <span className="onboarding-tag">#씨앗</span>
              <span className="onboarding-tag">#루틴</span>
            </div>
            <div className="onboarding-hero">
              <div className="onboarding-circle">
                <div className="onboarding-orbit"></div>
                <div className="onboarding-emoji">🌱</div>
              </div>
            </div>
            <div className="onboarding-bottom onboarding-center">
              <button className="onboarding-btn onboarding-btn-primary onboarding-btn-full" onClick={handleStart}>
                마음,씨 시작하기
              </button>
            </div>
          </section>

          {/* Step 1: 공감숲 소개 */}
          <section className={`onboarding-panel ${step !== 1 ? 'hidden' : ''}`} data-step="1">
            <div className="onboarding-bar">
              <div className="onboarding-dot active"></div>
              <div className="onboarding-dot"></div>
              <div className="onboarding-dot"></div>
            </div>
            <h1>공감숲에서 따뜻하게 연결</h1>
            <p className="onboarding-desc">공개를 선택하면 공감이 모이고, 서로의 정원이 자라요.</p>
            <div className="onboarding-tags">
              <span className="onboarding-tag">#공감</span>
              <span className="onboarding-tag">#안전한커뮤니티</span>
              <span className="onboarding-tag">#응원</span>
            </div>
            <div className="onboarding-hero">
              <div className="onboarding-circle">
                <div className="onboarding-orbit"></div>
                <div className="onboarding-emoji">🤝</div>
              </div>
            </div>
            <div className="onboarding-row onboarding-bottom">
              <button className="onboarding-btn-ghost" onClick={handlePrev}>이전</button>
              <button className="onboarding-btn onboarding-btn-primary onboarding-btn-wide" onClick={handleNext}>다음</button>
            </div>
          </section>

          {/* Step 2: 감정꽃 소개 */}
          <section className={`onboarding-panel ${step !== 2 ? 'hidden' : ''}`} data-step="2">
            <div className="onboarding-bar">
              <div className="onboarding-dot active"></div>
              <div className="onboarding-dot active"></div>
              <div className="onboarding-dot"></div>
            </div>
            <h1>감정꽃의 개화</h1>
            <p className="onboarding-desc">기록이 쌓이면 당신만의 감정꽃이 피어나요. 오늘의 나를 시각화해 보세요.</p>
            <div className="onboarding-tags">
              <span className="onboarding-tag">#시각화</span>
              <span className="onboarding-tag">#성장</span>
              <span className="onboarding-tag">#나의정원</span>
            </div>
            <div className="onboarding-hero">
              <div className="onboarding-circle">
                <div className="onboarding-orbit"></div>
                <div className="onboarding-emoji">🌸</div>
              </div>
            </div>
            <div className="onboarding-row onboarding-bottom">
              <button className="onboarding-btn-ghost" onClick={handlePrev}>이전</button>
              <button className="onboarding-btn onboarding-btn-primary onboarding-btn-wide" onClick={handleNext}>다음</button>
            </div>
          </section>

          {/* Step 3: 내 정원 시작 */}
          <section className={`onboarding-panel ${step !== 3 ? 'hidden' : ''}`} data-step="3">
            <div className="onboarding-bar">
              <div className="onboarding-dot active"></div>
              <div className="onboarding-dot active"></div>
              <div className="onboarding-dot active"></div>
            </div>
            <h1>내 정원을 시작해 볼까요?</h1>
            <p className="onboarding-desc">잠깐의 가입으로, 오늘부터 당신의 감정 정원이 자라요.</p>
            <div className="onboarding-hero">
              <div className="onboarding-circle">
                <div className="onboarding-orbit"></div>
                <div className="onboarding-emoji">🌿</div>
              </div>
            </div>
            <div className="onboarding-bottom">
              <div className="onboarding-row" style={{ marginBottom: '12px' }}>
                <button className="onboarding-btn-ghost" onClick={handlePrev}>이전</button>
                <button className="onboarding-btn onboarding-btn-outline onboarding-btn-wide" onClick={handleBrowse}>우선 둘러볼게요!</button>
              </div>
              <button className="onboarding-btn onboarding-btn-primary onboarding-btn-full" onClick={handleJoin}>회원가입하기</button>
            </div>
          </section>

          {/* Step 4: 회원가입 */}
          <section className={`onboarding-panel ${step !== 4 ? 'hidden' : ''}`} data-step="4">
            <SignupOnboardingStep
              onBack={handlePrev}
              onSocialClick={handleSocialLogin}
              onOpenLogin={() => {
                console.log('[OnboardingGuest] 로그인 페이지로 이동');
                diag.log('OnboardingGuest: 로그인 페이지로 이동');
                navigate('/login', { replace: true });
              }}
              loading={loading}
            />
          </section>

          {/* Step 5: 씨앗을 받았어요 */}
          <section className={`onboarding-panel ${step !== 5 ? 'hidden' : ''}`} data-step="5">
            <div className="onboarding-eyebrow">첫 번째 선물</div>
            <h1>씨앗을 받았어요</h1>
            <p className="onboarding-desc">이 씨앗은 오늘의 감정을 기록할 때마다 자라나요.</p>
            <div className="onboarding-hero">
              <div className="onboarding-circle">
                <div className="onboarding-orbit"></div>
                <div className="onboarding-emoji">🫧</div>
              </div>
            </div>
            <div className="onboarding-bottom onboarding-row">
              <button className="onboarding-btn-ghost" onClick={handlePrev}>이전</button>
              <button className="onboarding-btn onboarding-btn-primary onboarding-btn-wide" onClick={handleNext}>씨앗 이름 짓기</button>
            </div>
          </section>

          {/* Step 6: 씨앗명 작성 */}
          <section className={`onboarding-panel ${step !== 6 ? 'hidden' : ''}`} data-step="6">
            <div className="onboarding-eyebrow">씨앗 이름 짓기</div>
            <h1>이 씨앗을 어떻게{'\n'}불러줄까요?</h1>
            <div className="onboarding-desc">최대 12자, 특수문자 제외</div>
            <div style={{ margin: '12px 0' }}>
              <input
                id="seedName"
                className="onboarding-input"
                maxLength={12}
                placeholder="예: 마음씨, 오늘의나, 새벽씨"
                value={seedName}
                onChange={(e) => handleSeedNameChange(e.target.value)}
              />
              <div className={`onboarding-error ${seedError ? 'show' : ''}`}>이름을 1~12자의 한글/영문/숫자로 입력해 주세요.</div>
            </div>
            <div className="onboarding-bottom">
              <button 
                className="onboarding-btn onboarding-btn-primary onboarding-btn-full" 
                onClick={handleStep6Next}
                disabled={seedName.trim().length === 0}
                style={{
                  opacity: seedName.trim().length === 0 ? 0.5 : 1,
                  cursor: seedName.trim().length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                내 정원 만들기
              </button>
            </div>
          </section>

          {/* Step 7: 내 정원 바로가기 */}
          <section className={`onboarding-panel ${step !== 7 ? 'hidden' : ''}`} data-step="7">
            <div className="onboarding-eyebrow onboarding-center">준비 완료</div>
            <div className="onboarding-hero">
              <div className="onboarding-circle">
                <div className="onboarding-orbit"></div>
                <div className="onboarding-emoji">🌸</div>
              </div>
            </div>
            <h1 className="onboarding-center">당신의 정원이 준비되었어요</h1>
            <p className="onboarding-desc onboarding-center" id="finalCopy">{finalCopy}</p>
            <div className="onboarding-bottom">
              <button className="onboarding-btn onboarding-btn-primary onboarding-btn-full" onClick={handleGoHome}>내 정원 바로가기</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

