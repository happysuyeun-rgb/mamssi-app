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

// 빈 화면 감지 타임아웃 (3초)
let firstPaintDetected = false;
const paintObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint' || entry.name === 'first-paint') {
      firstPaintDetected = true;
      diag.log('main.tsx: First paint 감지', { time: entry.startTime });
    }
  }
});

try {
  paintObserver.observe({ entryTypes: ['paint'] });
} catch (e) {
  // PerformanceObserver를 지원하지 않는 브라우저
}

setTimeout(() => {
  if (!firstPaintDetected) {
    diag.warn('main.tsx: 3초 내 첫 paint 미감지 - 빈 화면 가능성');
    const banner = document.createElement('div');
    banner.style.cssText = `
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
    banner.innerHTML = `
      초기 로딩 지연 감지 — 새로고침 또는 <a href="/debug" style="color: #d97706; font-weight: 600;">/debug</a> 진입해 진단을 확인하세요
    `;
    document.body.appendChild(banner);
  }
}, 3000);

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
