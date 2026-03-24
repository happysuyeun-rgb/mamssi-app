## [2차 개발 계획] 공감 → 게이지 성장 +5pt (누적)

> 최종 업데이트: 2026-03-24


> 1차에서는 미구현. 공감이 `flowers` 게이지에 반영되는 작업은 **2차**에서 진행.

### 1) 목표
- 타인이 특정 `community_posts` 글에 공감(좋아요)을 하면, 해당 글의 작성자 `flowers`(진행 중 꽃) 게이지가 **공감 1회당 +5pt 누적**으로 증가해야 한다.
- 기존 “감정 기록 저장” 기반 성장 로직(`emotions -> flowers`)은 유지한다.

### 2) 기본 설계 방향(누적)
- 누적 방식: 공감이 **생성(INSERT)** 될 때만 `+5pt`를 적용한다.
- **공감 취소(DELETE) 시 게이지 되돌림 없음** (최종 확정). 한 번 받은 성장 포인트는 유지한다.
- 게이지 상한: `growth_percent`(또는 실제 DB의 growth 컬럼)에 대해 최대 100까지.

### 3) 성장/개화 처리
- `growth_percent`가 100 이상이 되면(또는 기존 로직의 개화 임계 조건 충족) `is_bloomed=true`, `bloomed_at=now()`로 전환한다.
- `flower_type` 결정:
  - 1차(필수 최소, **최종 확정**): 공감·게이지만으로 개화할 때 `flower_type`은 **`SUNFLOWER`(햇살꽃)** 로 고정.
  - 2차(선택): 기존 `updateFlowerGrowth()`에서 하던 “감정 분포 기반 flower_type 결정” 로직을 재사용/추출해서 같은 규칙을 적용.

### 4) DB 구현 방식(추천)
- `community_likes`에 대해 **`after insert`만** 트리거를 건다(취소 시 되돌림 없음이므로 DELETE는 flowers에 연결하지 않음).
- 트리거는 `community_posts.user_id`(글 작성자)를 조회한 뒤, `flowers` row에 **+5**만 적용하는 DB 함수 호출.
- DB 함수는 `SECURITY DEFINER`로 작성해서 RLS/권한 문제를 피한다.

### 5) 개발 단계(우선순위 순)
1. DB 스키마 확인
   - 현재 `public.flowers` 컬럼명이 앱 코드(`growth_percent`, `is_bloomed`, `bloomed_at`, `flower_type`)와 일치하는지 확인
   - 불일치가 있으면 문서/SQL을 실제 컬럼명에 맞게 조정
2. SQL 함수 작성
   - `add_like_points_to_flower(target_user_id uuid, delta int)` 같은 이름으로 함수 생성
   - flowers row가 없으면 생성(ensure seed)
   - growth delta 적용 + 개화 처리
3. 트리거 작성
   - `community_likes` INSERT: +5만 적용
   - `community_likes` DELETE: flowers 게이지 변경 없음
4. 실시간/홈 화면 반영 확인
   - 홈(`useHomeData`)이 `community_posts`를 합산하는 부분이 있고, flowers 게이지는 `flowers` realtime 구독으로 갱신됨
   - 공감으로 flowers가 갱신되면 홈 게이지가 정상적으로 반영되는지 확인
5. QA 및 회귀 테스트
   - 공감 1회 후 작성자 게이지 증가
   - 공감 취소 후에도 게이지는 **변하지 않음**(되돌림 없음)
   - 여러 번 공감/동시성 시나리오
   - 개화 임계치 도달 시 bloom 상태 전환
   - 감정 기록 저장 로직과 충돌 없음(기존 성장 + 공감 성장 병행 여부 확인)

### 6) 필요한 테스트 케이스(권장)
- DB 단위:
  - like insert → growth +5 확인 / like delete → growth **불변** 확인
  - bloom transition(100 도달 시 is_bloomed/bloomed_at 변경 확인)
- API/앱 단위:
  - 공감 토글 UI → 작성자 게이지 UI 반영 확인(홈/마이페이지)

### 7) 최종 결정(반영됨)
- 공감 취소 시 **-5pt 되돌림 없음**.
- 1차 개화 시 `flower_type` **기본 = `SUNFLOWER`(햇살꽃)**.

