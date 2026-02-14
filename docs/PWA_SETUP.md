# PWA(프로그레시브 웹 앱) 설정 가이드

플레이 스토어 배포를 위한 PWA 구성입니다.

## 구성 요소

### 1. Manifest (`public/manifest.json`)
- 앱 이름: 마음,씨
- 짧은 이름: Mamssi
- 설명: 당신의 감정이 꽃이 되는 시간
- 테마/배경색: #ffffff
- 다양한 크기의 아이콘 (72~512px)

### 2. 아이콘 (`public/icons/`)
- `icon.svg` - 원본 (mamssi_main.svg 기반)
- `icon-72.png` ~ `icon-512.png` - PNG 변환

아이콘 재생성: `npm run generate-pwa-icons`

### 3. Service Worker (vite-plugin-pwa)
- 오프라인 지원
- 자동 업데이트
- Supabase API 캐싱

### 4. 메타 태그 (`index.html`)
- `theme-color`
- `apple-mobile-web-app-*`
- `link rel="manifest"`
- `apple-touch-icon`

## Play Store 배포 (PWABuilder)

1. 프로덕션 빌드: `npm run build`
2. 배포된 URL로 [PWABuilder](https://www.pwabuilder.com/) 접속
3. 패키지 생성 후 Play Store 제출

## 참고

- 이 프로젝트는 **Vite** 기반이므로 `next-pwa`가 아닌 **vite-plugin-pwa** 사용
- HashRouter 사용 시 `start_url`은 `/#/` 또는 `/`로 설정됨
