/**
 * PWA 아이콘 생성 스크립트
 * public/icons/icon.svg를 기반으로 다양한 사이즈의 PNG 생성
 * 실행: npm run generate-pwa-icons
 */
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '../public/icons/icon.svg');
const outDir = path.join(__dirname, '../public/icons');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      'sharp 패키지가 필요합니다. 설치: npm install --save-dev sharp'
    );
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);
  console.log('PWA 아이콘 생성 중...');

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`  ✓ icon-${size}.png`);
  }
  console.log('완료.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
