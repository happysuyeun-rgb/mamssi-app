const fs = require('fs');
const path = require('path');

function extractConst(filePath) {
  const raw = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  const start = raw.indexOf('`') + 1;
  const end = raw.lastIndexOf('`');
  return raw.slice(start, end);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const terms = extractConst('src/constants/termsOfService.ts');
const privacy = extractConst('src/constants/privacyPolicy.ts');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>마음씨 약관 미리보기</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif; background: #f5f5f5; color: #16352f; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
    .tabs button { padding: 10px 16px; border: 1px solid #e5e5e5; background: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .tabs button.active { background: #2f6f63; color: #fff; border-color: #2f6f63; }
    .panel { display: none; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .panel.active { display: block; }
    .panel pre { margin: 0; font-family: inherit; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>🌱 마음씨 약관 미리보기</h1>
    <div class="tabs">
      <button type="button" class="active" data-tab="terms">서비스 이용약관</button>
      <button type="button" data-tab="privacy">개인정보 처리방침</button>
    </div>
    <div id="terms" class="panel active"><pre>${esc(terms)}</pre></div>
    <div id="privacy" class="panel"><pre>${esc(privacy)}</pre></div>
  </div>
  <script>
    document.querySelectorAll('.tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });
  </script>
</body>
</html>
`;

const outPath = path.join(__dirname, '..', 'public', 'terms-preview.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log('Created public/terms-preview.html');
