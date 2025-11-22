import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/', // 서브경로 배포 시 여기 수정 (예: '/app/')
  resolve: {
    alias: {
      '@routes': resolve(rootDir, 'src/routes'),
      '@pages': resolve(rootDir, 'src/pages'),
      '@components': resolve(rootDir, 'src/components'),
      '@store': resolve(rootDir, 'src/store'),
      '@constants': resolve(rootDir, 'src/constants'),
      '@utils': resolve(rootDir, 'src/utils'),
      '@styles': resolve(rootDir, 'src/styles'),
      '@mocks': resolve(rootDir, 'src/mocks'),
      '@canvas': resolve(rootDir, 'src/canvas'),
      '@domain': resolve(rootDir, 'src/types'),
      '@config': resolve(rootDir, 'src/config'),
      '@hooks': resolve(rootDir, 'src/hooks'),
      '@services': resolve(rootDir, 'src/services'),
      '@lib': resolve(rootDir, 'src/lib'),
      '@providers': resolve(rootDir, 'src/providers'),
      '@boot': resolve(rootDir, 'src/boot'),
      '@types': resolve(rootDir, 'src/types')
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
