import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 각 테스트 후 cleanup
afterEach(() => {
  cleanup();
});

// 전역 mock 설정은 제거 (무한 루프 방지)
// console.error는 그대로 사용
