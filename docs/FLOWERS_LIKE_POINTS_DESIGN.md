## [2차 개발 계획] 공감 → 꽃 성장(+5pt) 로직 정밀 설계서

> 최종 업데이트: 2026-03-26


> 1차에서는 미구현. **2차**에서 DB 트리거·함수 등으로 연결 예정.

### 1. 문제 정의
- 현재 시스템에서 공감(`community_likes`)은 `community_posts.like_count`에는 반영되지만,
  작성자의 `flowers.growth_percent`(게이지) 성장에는 연결되어 있지 않다.
- 요구사항: 타인의 공감이 글 작성자의 게이지 성장에 **+5pt 누적**으로 반영되어야 한다.

### 2. 핵심 규칙(최종 확정)
1. 포인트: 공감 1회당 **+5pt** (INSERT 시에만 적용)
2. 누적 방식: 공감 row가 **추가될 때마다** 작성자 flowers에 +5
3. 공감 취소: 공감 row 삭제 시 **flowers 게이지 되돌림 없음** (한 번 반영된 +5는 유지)
4. 게이지 범위: `growth_percent`는 0~100을 유지
5. 개화:
   - `growth_percent`가 100 이상이 되고 `is_bloomed=false`라면 개화 처리
   - `is_bloomed=true`, `bloomed_at=now()`
6. flower_type:
   - 1차: **`SUNFLOWER`(햇살꽃)** 고정
   - 2차: 감정 분포 기반 결정 로직을 통합(선택)

### 3. 데이터 모델/컬럼 대응
- 앱 코드 기준으로 기대하는 `flowers` 컬럼:
  - `user_id`
  - `growth_percent`
  - `is_bloomed`
  - `bloomed_at`
  - `flower_type`
- SQL 구현 시, 실제 DB 컬럼명과 앱 기대 컬럼명이 다를 수 있으므로(과거 스크립트 편차),
  반드시 실제 컬럼명을 확인한 뒤 동일 의미로 매핑한다.

### 4. 트랜잭션/동시성 고려
- 공감은 동시에 여러 사용자가 발생할 수 있다.
- `UPDATE flowers SET growth_percent = LEAST(100, growth_percent + delta)` 형태로 단일 SQL 업데이트를 사용하면,
  트랜잭션 경쟁 상황에서 누락을 줄일 수 있다.
- delta가 음수(-5)일 수 있으므로 `GREATEST(0, ...)`를 적용해 음수 방지.

### 5. DB 구현 상세
#### 5.1 함수: `add_like_points_to_flower(target_user_id, delta)`
역할:
- target_user_id(글 작성자)의 flowers row를 보장(없으면 seed row 생성)
- growth_percent를 delta만큼 증감
- 개화 조건 만족 시 bloom 상태/시간 반영

필수 동작:
1) flowers row 보장
2) growth_percent 갱신
3) bloom 전환(if needed)

#### 5.2 트리거: `community_likes` INSERT만
- INSERT:
  - NEW.post_id → community_posts.user_id 조회 → delta=+5
- DELETE:
  - flowers 게이지 **변경하지 않음**

#### 5.3 RLS/권한
- 현재 `flowers`는 RLS로 “본인만 update” 정책이 존재한다.
- 트리거가 실행하는 함수는 `SECURITY DEFINER`로 작성해서,
  트리거 호출자(auth.uid)와 무관하게 target user의 flowers를 갱신할 수 있어야 한다.
- SECURITY DEFINER 함수에서는:
  - search_path 고정(가능하면)
  - 입력 파라미터 타입 검증
  - 업데이트 쿼리 범위를 target_user_id로 제한

### 6. API/UI 반영 포인트
- 앱에서 “작성자 게이지”는 `flowers` realtime 구독을 통해 갱신되는 구조로 보인다.
- 따라서 공감 트리거로 flowers가 업데이트되면:
  - 홈 게이지/게이지 표시가 자동 갱신
  - 마이페이지의 성장도 반영

### 7. 보완/추가 로직(2차 옵션)
1. flower_type 결정 품질 개선
   - bloom 시점에 “현재까지의 감정 분포” 기반으로 flower_type을 결정하도록 개선
2. 공감 포인트의 스케일링
   - 공개 글/카테고리별 가중치(예: 공개글은 +7, 개인글은 +5 등) 확장
3. 개화 시 앨범 스냅샷 생성
   - 감정 기록 기반 개화 때 하던 앨범 생성 기능을 공감 기반 개화에도 동일하게 적용

### 8. 최종 결정(반영됨)
- 공감 취소 시 **되돌림 없음**
- bloom 시 1차 `flower_type` = **`SUNFLOWER`(햇살꽃)**

