import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '@providers/AuthProvider';
import { NotifyProvider } from '@providers/NotifyProvider';
import ErrorBoundary from '@components/ErrorBoundary';
import { diag } from '@boot/diag';
import { safeStorage } from '@lib/safeStorage';
import App from './App';

// Global Styles
import '@styles/tokens.css';
import '@styles/globals.css';

diag.log('main.tsx: 앱 부팅 시작');

// Storage 접근성 테스트
const storageTest = safeStorage.test();
diag.log('main.tsx: Storage 접근성:', storageTest);

const rootElement = document.getElementById('root');

if (!rootElement) {
  diag.err('main.tsx: Root element not found');
  throw new Error('Root element not found');
}

diag.log('main.tsx: Root element 발견, 렌더링 시작');

// 빈 화면 감지 타임아웃 (5초로 증가, 실제 로딩 완료 시 자동 제거)
let firstPaintDetected = false;
let loadingBanner: HTMLDivElement | null = null;

const paintObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint' || entry.name === 'first-paint') {
      firstPaintDetected = true;
      diag.log('main.tsx: First paint 감지', { time: entry.startTime });
      // 첫 paint 감지 시 배너 제거
      if (loadingBanner) {
        loadingBanner.remove();
        loadingBanner = null;
      }
    }
  }
});

try {
  paintObserver.observe({ entryTypes: ['paint'] });
} catch (e) {
  // PerformanceObserver를 지원하지 않는 브라우저
}

// 배너 제거 함수
const removeLoadingBanner = () => {
  if (loadingBanner) {
    loadingBanner.remove();
    loadingBanner = null;
    diag.log('main.tsx: 로딩 배너 제거');
  }
};

// DOMContentLoaded 이벤트로도 배너 제거
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (firstPaintDetected) {
        removeLoadingBanner();
      }
    }, 1000);
  });
} else {
  // 이미 로드된 경우
  firstPaintDetected = true;
}

// 타임아웃 증가 (3초 -> 5초) 및 배너 자동 제거 로직 추가
setTimeout(() => {
  if (!firstPaintDetected && !loadingBanner) {
    diag.warn('main.tsx: 5초 내 첫 paint 미감지 - 빈 화면 가능성');
    loadingBanner = document.createElement('div');
    loadingBanner.id = 'loading-delay-banner';
    loadingBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fffbe6;
      border-bottom: 1px solid #fbbf24;
      padding: 12px 16px;
      z-index: 10000;
      font-size: 14px;
      color: #92400e;
      text-align: center;
    `;
    loadingBanner.innerHTML = `
      초기 로딩 지연 감지 — 새로고침 또는 <a href="/debug" style="color: #d97706; font-weight: 600;">/debug</a> 진입해 진단을 확인하세요
    `;
    document.body.appendChild(loadingBanner);

    // 10초 후 자동 제거 (사용자가 무시할 수 있도록)
    setTimeout(() => {
      removeLoadingBanner();
    }, 10000);
  }
}, 5000);

// 전역 함수로 배너 제거 가능하게 (AuthProvider/Guard에서 호출 가능)
(window as any).__removeLoadingBanner = removeLoadingBanner;

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <NotifyProvider>
            <App />
          </NotifyProvider>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

diag.log('main.tsx: 렌더링 완료');
