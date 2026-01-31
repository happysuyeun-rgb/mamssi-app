# 탭 네비게이션 시 잠금 화면 재표시 버그 분석

## 현상
- 잠금 해제 후 홈 탭 클릭 시 "마음을 감싸기" 패턴 화면이 다시 표시됨

## 원인 분석

### 1. App.tsx useEffect 의존성 문제 (핵심 원인)

```javascript
useEffect(() => {
  const checkLock = () => { ... };
  checkLock();
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [location.pathname]);  // ← 문제: 탭 클릭 시 pathname 변경마다 effect 재실행
```

**흐름:**
1. 사용자가 잠금 해제 → `handleUnlock()` 호출 → `sessionStorage.setItem(LOCK_SESSION_KEY, 'true')` + `setIsLocked(false)`
2. 앱 화면 표시 (Guard/Routes), TabBar 노출
3. 사용자가 홈 탭 클릭 → NavLink가 `"/"`로 이동 → `location.pathname` 변경 (예: `/record` → `/`)
4. **useEffect가 pathname 변경으로 다시 실행** → `checkLock()` 재호출
5. 이때 `checkLock()`이 잘못된 결과를 반환하거나, 타이밍/클로저 이슈로 `isLocked`가 true로 설정될 수 있음

### 2. 불필요한 pathname 의존성

잠금 상태는 **경로와 무관**합니다.
- `sessionUnlocked`: sessionStorage (탭 내 세션 동안 유지)
- `settings.enabled`: localStorage (잠금 설정)

탭 네비게이션 시 `checkLock`을 다시 실행할 필요가 없습니다. 오히려:
- 매 네비게이션마다 effect 재실행 → cleanup → 재등록
- React 배칭/렌더 순서에 따른 경쟁 조건 가능성

### 3. "마음을 감싸기" 패턴 화면이 나오는 이유

LockScreen은 `settings.mode === 'pattern'`일 때 패턴 UI를 표시합니다.
- localStorage에 `mode: 'pattern'`이 저장된 경우 (기본값 또는 이전 설정)
- 설정 UI에서는 PIN만 노출하지만, 기존 데이터에 pattern이 남아있을 수 있음

## 해결 방안

1. **useEffect 의존성에서 `location.pathname` 제거**
   - 마운트 시 1회 + storage 이벤트 시에만 `checkLock` 실행
   - 탭 네비게이션 시 불필요한 재실행 방지

2. **(선택) pattern 모드 제거**
   - PIN만 지원한다면 LockScreen에서 pattern 분기 제거하고 항상 PIN UI 표시
