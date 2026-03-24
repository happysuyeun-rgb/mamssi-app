export type FlowerData = {
  title: string;
  date: string;
  water?: number;
  emoji: string;
  flowerImageSrc?: string;
  message?: string;
};

const canvasRenderVersion = new WeakMap<HTMLCanvasElement, number>();
const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const image = new Image();
  image.src = src;
  imageCache.set(src, image);
  return image;
}

export function drawFlowerCanvas(canvas: HTMLCanvasElement, data: FlowerData) {
  const currentVersion = (canvasRenderVersion.get(canvas) ?? 0) + 1;
  canvasRenderVersion.set(canvas, currentVersion);

  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  // HiDPI(레티나) 선명도 보정: 실제 버퍼를 표시 크기 * DPR로 맞춘다.
  const targetWidth = Math.round(cssWidth * dpr);
  const targetHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const g = canvas.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const drawFrame = (flowerImage?: HTMLImageElement, logoImage?: HTMLImageElement) => {
    if (canvasRenderVersion.get(canvas) !== currentVersion) return;
    g.clearRect(0, 0, cssWidth, cssHeight);

    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, cssWidth, cssHeight);

    // 기존(96px) 대비 2배+α 크기(220px)로 중앙 배치
    const flowerSize = 220;
    const flowerX = Math.floor((cssWidth - flowerSize) / 2);
    const flowerY = 62;

    if (flowerImage) {
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(flowerImage, flowerX, flowerY, flowerSize, flowerSize);
    } else {
      g.fillStyle = '#0f766e';
      g.font = '84px serif';
      g.textAlign = 'center';
      g.fillText(data.emoji, cssWidth / 2, flowerY + flowerSize * 0.75);
      g.textAlign = 'left';
    }

    const textMaxWidth = cssWidth - 24 - 24;
    const message = (data.message ?? '').trim();
    if (message) {
      g.fillStyle = '#0f4233';
      g.font = '400 12px system-ui';
      g.textAlign = 'center';
      let text = `“${message}”`;
      while (g.measureText(text).width > textMaxWidth && text.length > 2) {
        text = text.slice(0, -2) + '…”';
      }
      // 꽃 이미지 위 중앙
      g.fillText(text, cssWidth / 2, flowerY - 12);
      g.textAlign = 'left';
    }

    // 씨앗명 / 개화날짜: 왼쪽 하단, 10px regular
    g.fillStyle = '#475569';
    g.font = '400 10px system-ui';
    g.fillText(`${data.title} / ${data.date}`, 12, cssHeight - 20);

    // 우하단 로고: 오른쪽 여백 12px 기준 정렬
    const logoBoxHeight = 36;
    const logoY = cssHeight - 54;
    if (logoImage) {
      const naturalW = logoImage.naturalWidth || 170;
      const naturalH = logoImage.naturalHeight || logoBoxHeight;
      const ratio = Math.min(170 / naturalW, logoBoxHeight / naturalH);
      const drawW = Math.round(naturalW * ratio);
      const drawH = Math.round(naturalH * ratio);
      const drawX = cssWidth - 12 - drawW;
      const drawY = logoY + Math.floor((logoBoxHeight - drawH) / 2);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(logoImage, drawX, drawY, drawW, drawH);
    }
  };

  const logo = getCachedImage('/logo.png');
  let flowerLoaded = false;
  let logoLoaded = false;
  let flowerImage: HTMLImageElement | undefined;
  let logoImage: HTMLImageElement | undefined;

  const tryRender = () => {
    if (canvasRenderVersion.get(canvas) !== currentVersion) return;
    if (!logoLoaded) return;
    if (data.flowerImageSrc && !flowerLoaded) return;
    drawFrame(flowerImage, logoImage);
  };

  if (logo.complete) {
    logoImage = logo;
    logoLoaded = true;
  } else {
    logo.onload = () => {
      logoImage = logo;
      logoLoaded = true;
      tryRender();
    };
    logo.onerror = () => {
      logoLoaded = true;
      tryRender();
    };
  }

  if (data.flowerImageSrc) {
    const image = getCachedImage(data.flowerImageSrc);
    if (image.complete) {
      flowerImage = image;
      flowerLoaded = true;
    } else {
      image.onload = () => {
        flowerImage = image;
        flowerLoaded = true;
        tryRender();
      };
      image.onerror = () => {
        flowerLoaded = true;
        tryRender();
      };
    }
  } else {
    flowerLoaded = true;
  }

  tryRender();
}
