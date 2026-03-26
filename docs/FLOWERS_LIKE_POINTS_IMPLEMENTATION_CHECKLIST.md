## [2차 개발 계획] 공감 → 게이지 성장(+5pt) 구현 체크리스트/리스크

> 최종 업데이트: 2026-03-26


> 1차에서는 미구현. 구현 시 이 문서를 기준으로 검증.

### 1) 먼저 확인(필수)
1. `public.flowers` 컬럼명 확정
   - 앱 코드 기대: `growth_percent`, `is_bloomed`, `bloomed_at`, `flower_type`
   - 레포 내 일부 DB 스크립트 과거 버전 표기가 `growth_pct`, `bloom_level`일 수 있음
   - 실제 DB 컬럼명을 기준으로 SQL 함수를 매핑해야 함
2. “진행 중” 꽃 row 의미
   - 앱/코드 기준: `is_bloomed = false`인 row를 사용
   - likes 포인트가 쌓여 개화로 전환되면 `is_bloomed=true`로 바뀌므로,
     이후에는 “진행 중 row”가 없을 수 있으니 seed row 생성 전략을 반드시 포함
3. `flowers`에 대한 RLS/권한
   - 현재 RLS: 기본적으로 “본인만 update” 정책이 존재
   - 트리거는 다른 사용자의 row를 수정해야 하므로 `SECURITY DEFINER` 함수로 우회 필요

### 2) 트리거 충돌/동작 순서
- 이미 `community_likes`에 대해 `community_posts.like_count` 갱신 트리거가 존재
- 새 트리거(또는 함수 호출)는 같은 테이블에서 동작하므로:
  - 두 트리거가 서로 교차 의존하지 않도록 설계
  - 개별 트리거가 실패해도 전체 트랜잭션이 깨지지 않도록(필요 시 예외 처리) 고려

### 3) 함수 설계 세부(권장 시나리오)
#### 3.1 함수 입력
- `target_user_id uuid`
- `delta int` — likes 경로에서는 **+5만** 사용 (DELETE 시 함수 미호출 또는 no-op)

#### 3.2 함수 처리(핵심 쿼리 형태)
1) flowers row 보장(없으면 insert)
2) growth delta 적용:
   - `growth = LEAST(100, GREATEST(0, growth + delta))`
3) bloom 전환:
   - growth가 100 이상이고 `is_bloomed=false`이면 bloom 처리

#### 3.3 flower_type 처리(1차 최소, 확정)
- 공감·게이지만으로 개화할 때 bloom 시 `flower_type` = **`SUNFLOWER`(햇살꽃)**
- 2차에서 감정 분포 기반 로직 적용 가능하도록 TODO로 남김

### 4) 동시성/정합성
- 같은 사용자가 짧은 시간에 여러 공감을 누르면 트리거가 연속 호출됨
- 아래를 보장해야 함:
  - growth 증가가 “누락되지 않고 누적”됨
  - 공감 취소로 인한 감소는 **없음**(likes DELETE는 flowers 미변경)
  - bloomed_at은 최초 개화 시점에만 유효하도록 조건 부여

### 5) 성능
- 트리거 1회마다
  - `community_posts`에서 target user_id 조회 1회 + `flowers` 업데이트 1회가 필요
- 좋아요 이벤트량이 많아지면 튜닝 포인트:
  - `community_likes(post_id)` 인덱스는 이미 존재하는지 확인
  - `community_posts(id)`는 PK이므로 조회는 상대적으로 안정적

### 6) 테스트 플랜
1. DB 테스트(필수)
   - like insert → flowers growth +5 확인
   - like delete → flowers growth -5 확인(0 floor)
   - 100 도달 → is_bloomed=true & bloomed_at set 확인
2. 앱 회귀 테스트(권장)
   - 홈/마이페이지 게이지가 likes 이후 realtime 반영되는지 확인
   - 공감 UI와 flowers 게이지가 동기화되는지 확인

### 7) 최종 결정(반영됨)
1. 공감 취소 시 **-5 되돌림 없음**
2. 1차 bloom `flower_type` = **`SUNFLOWER`(햇살꽃)**

