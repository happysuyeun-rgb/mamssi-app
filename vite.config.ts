import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  base: '/', // 서브경로 배포 시 여기 수정 (예: '/app/')
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 550,
  },
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
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true
  }
});
