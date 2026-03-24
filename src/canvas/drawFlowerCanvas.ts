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
const imageContentBoundsCache = new Map<string, { x: number; y: number; width: number; height: number }>();

function getCachedImage(src: string): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const image = new Image();
  image.src = src;
  imageCache.set(src, image);
  return image;
}

function getImageContentBounds(image: HTMLImageElement): { x: number; y: number; width: number; height: number } {
  const key = image.currentSrc || image.src;
  const cached = imageContentBoundsCache.get(key);
  if (cached) return cached;

  const w = image.naturalWidth || 0;
  const h = image.naturalHeight || 0;
  if (w === 0 || h === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) {
    return { x: 0, y: 0, width: w, height: h };
  }

  ctx.drawImage(image, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  // 흰 배경 꽃 에셋 기준: 거의 흰색/투명 픽셀은 배경으로 간주
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      const nearWhite = r >= 246 && g >= 246 && b >= 246;
      if (a > 10 && !nearWhite) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  let bounds: { x: number; y: number; width: number; height: number };
  if (maxX < minX || maxY < minY) {
    bounds = { x: 0, y: 0, width: w, height: h };
  } else {
    // 가장자리 여유를 조금 남겨 자연스럽게 보정
    const padX = Math.round((maxX - minX + 1) * 0.06);
    const padY = Math.round((maxY - minY + 1) * 0.06);
    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const right = Math.min(w - 1, maxX + padX);
    const bottom = Math.min(h - 1, maxY + padY);
    bounds = { x, y, width: right - x + 1, height: bottom - y + 1 };
  }

  imageContentBoundsCache.set(key, bounds);
  return bounds;
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

    // 꽃 표시 박스(콘텐츠 기준으로 자동 크롭하여 박스 안에 배치)
    const flowerBoxWidth = 220;
    const flowerBoxHeight = 196;
    const flowerBoxX = Math.floor((cssWidth - flowerBoxWidth) / 2);
    const flowerBoxY = 46;

    if (flowerImage) {
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      const b = getImageContentBounds(flowerImage);
      const scale = Math.min(flowerBoxWidth / b.width, flowerBoxHeight / b.height);
      const drawW = Math.round(b.width * scale);
      const drawH = Math.round(b.height * scale);
      const drawX = flowerBoxX + Math.floor((flowerBoxWidth - drawW) / 2);
      const drawY = flowerBoxY + Math.floor((flowerBoxHeight - drawH) / 2);
      g.drawImage(flowerImage, b.x, b.y, b.width, b.height, drawX, drawY, drawW, drawH);
    } else {
      g.fillStyle = '#0f766e';
      g.font = '84px serif';
      g.textAlign = 'center';
      g.fillText(data.emoji, cssWidth / 2, flowerBoxY + flowerBoxHeight * 0.75);
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
      g.fillText(text, cssWidth / 2, flowerBoxY - 12);
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
