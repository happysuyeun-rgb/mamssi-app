# 품질 도구 가이드

## 설치된 도구

### ESLint
- 코드 품질 및 스타일 검사
- TypeScript 지원
- React Hooks 규칙 적용

### Prettier
- 코드 포맷팅 자동화
- 일관된 코드 스타일 유지

## 사용 방법

### Lint 실행
```bash
# Lint 검사
npm run lint

# Lint 자동 수정
npm run lint:fix
```

### 포맷팅 실행
```bash
# 코드 포맷팅
npm run format

# 포맷팅 검사 (CI/CD용)
npm run format:check
```

### 타입 체크
```bash
# TypeScript 타입 체크
npm run type-check
```

## VS Code 설정

`.vscode/settings.json` 파일이 포함되어 있어 VS Code에서 자동으로:
- 저장 시 포맷팅
- ESLint 자동 수정
- Prettier 포맷터 사용

## Pre-commit Hook (선택사항)

Husky를 사용하여 pre-commit hook을 설정할 수 있습니다:

```bash
# Husky 설치
npm install --save-dev husky lint-staged

# Husky 초기화
npx husky init

# pre-commit hook 추가
echo "npx lint-staged" > .husky/pre-commit
```

`package.json`에 `lint-staged` 설정 추가:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

## 규칙

### ESLint 규칙
- `@typescript-eslint/no-explicit-any`: `any` 타입 사용 경고
- `@typescript-eslint/no-unused-vars`: 사용하지 않는 변수 경고
- `react-hooks/rules-of-hooks`: React Hooks 규칙 강제
- `react-hooks/exhaustive-deps`: useEffect 의존성 배열 검사
- `no-console`: console.log 사용 경고 (console.warn, console.error 허용)

### Prettier 설정
- 세미콜론 사용
- 작은따옴표 사용
- 줄 길이: 100자
- 탭 크기: 2칸
- 화살표 함수 괄호: 항상 사용
