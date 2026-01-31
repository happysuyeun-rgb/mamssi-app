# Vercel Build 실패 수정 가이드

**증상**: `node_modules/.bin/vite Permission denied (exit 126)`  
**원인**: 실행 권한 비트 손상. 주로 `node_modules`가 레포에 커밋되었거나, Vercel 캐시가 손상된 경우 발생.

---

## 1) node_modules 커밋 여부 확인 및 제거

### 확인

```bash
# node_modules가 Git에 추적되는지 확인
git ls-files node_modules | head -5
```

출력이 있으면 `node_modules`가 커밋된 상태입니다.

### 제거 절차

```bash
# 1. Git 추적에서 제거 (파일은 로컬에 유지)
git rm -r --cached node_modules

# 2. .gitignore에 node_modules 추가 (없다면)
echo "node_modules" >> .gitignore
echo "dist" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# 3. 커밋
git add .gitignore
git commit -m "chore: remove node_modules from repo, add .gitignore"
git push
```

### 커밋 가이드 (재발 방지)

- **절대 커밋하지 말 것**: `node_modules`, `dist`, `.env`, `.env.local`
- `.gitignore`에 위 항목이 포함되어 있는지 확인
- 새로 클론한 뒤 `npm install`로 의존성 설치

---

## 2) Vercel Install Command를 npm ci로 고정

### 설정 방법

1. Vercel Dashboard → 프로젝트 선택 → **Settings** → **General**
2. **Build & Development Settings** 섹션에서:
   - **Install Command**: `npm ci` (기본값 `npm install` 대신)
3. **Save** 클릭

### npm ci를 쓰는 이유

- `package-lock.json`과 정확히 맞는 버전으로 설치
- `node_modules`를 삭제 후 재설치해 깨끗한 상태 유지
- CI/CD에서 권장되는 방식

---

## 3) package-lock.json 확인

### 현재 상태

- `package-lock.json`이 **프로젝트 루트에 존재**합니다.

### 없을 경우 생성 및 커밋

```bash
# lock 파일 생성
npm install

# 커밋
git add package-lock.json
git commit -m "chore: add package-lock.json for reproducible builds"
git push
```

`npm ci`는 `package-lock.json`이 있어야 동작합니다.

---

## 4) Vercel 캐시 클리어 후 재배포

### 절차

1. **Vercel Dashboard** → 프로젝트 → **Deployments**
2. 최근 실패한 배포의 **⋮** 메뉴 → **Redeploy**
3. **Redeploy** 대화상자에서 **"Clear cache and redeploy"** 체크
4. **Redeploy** 클릭

### CLI 사용 시

```bash
# Vercel CLI 설치 후
vercel --force
```

`--force`는 캐시를 무시하고 새로 빌드합니다.

---

## 체크리스트 요약

| 항목 | 확인 | 조치 |
|------|------|------|
| node_modules가 Git에 커밋됨 | `git ls-files node_modules` | `git rm -r --cached node_modules` |
| .gitignore에 node_modules | `.gitignore` 확인 | `node_modules`, `dist`, `.env` 추가 |
| package-lock.json 존재 | 프로젝트 루트 | 있음 ✓ / 없으면 `npm install` 후 커밋 |
| Vercel Install Command | Settings → Install Command | `npm ci`로 설정 |
| Vercel 캐시 | Redeploy 시 | "Clear cache and redeploy" 선택 |

---

## .gitignore 예시 (없는 경우)

프로젝트 루트에 `.gitignore`가 없다면 아래 내용으로 생성하세요:

```
node_modules
dist
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage
.vite
```
