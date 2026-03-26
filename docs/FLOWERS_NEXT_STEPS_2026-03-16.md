## 2026-03-16 Flowers 다음 개발 제안 (Next Steps)

> 최종 업데이트: 2026-03-26


이 문서는 오늘(2026-03-16)까지 반영된 “감정 분포 기반 flower_type 결정” 기능을 기준으로, **추가로 진행하면 효과가 큰 개발 항목**을 정리한 것이다.  
필수/선택을 구분해 우선순위대로 나열한다.

---

## 1. 우선순위 높음 (추천)

### 1.1 `cycle_start_at` 자동 세팅 로직 추가 (current_cycle 실효성 확보)

**현재 상태**
- `getEmotionDistribution(userId, supabase, 'current_cycle')`는 `flowers.cycle_start_at`을 기준으로 감정 분포 범위를 자른다.
- 하지만 `cycle_start_at`을 **언제/어디서 세팅할지**가 아직 확정/구현되지 않으면, 많은 유저에서 `cycle_start_at`이 null로 남아 사실상 `'all'`처럼 동작한다.

**권장 설계 방향**
- 개화가 완료되는 순간(또는 개화 직후)에 **다음 사이클 시작 시점**을 확정한다.
- 대표적인 방식 2가지:
  - **A안: “새 진행 꽃 생성 시” `cycle_start_at = now()`**
    - 개화 후 다음 “진행 중 꽃” row를 만들 때 cycle 시작을 명확히 찍는다.
  - **B안: “개화 처리 직후” 현재 row에 `cycle_start_at`을 갱신**
    - 다만 개화된 row를 앨범으로 남기고 진행 중 row를 분리하는 구조라면 A안이 더 자연스럽다.

**완료 기준(예)**
- 개화가 한 번 발생한 이후부터는, 다음 개화에서는 이전 사이클의 감정 기록이 분포에 포함되지 않는다.

---

### 1.2 이모지 → 실제 이미지 적용 (UI 교체)

**현재 상태**
- UI에서는 `FLOWER_TYPE_TO_EMOJI`(임시 이모지)를 사용해 꽃을 표현한다.
- 실제 이미지 파일은 `public/assets/flowers/`에 10개가 업로드되어 있다.
  - 현재 파일명은 감정 코드 기준: `JOY.png`, `CALM.png`, ... `ANGER.png`

**권장 설계 방향**
- 목표는 “이모지 → 이미지”를 **바꾸기 쉬운 구조**로 만드는 것.
- 다음 중 하나로 정리하면 유지보수가 쉬워진다.

1) **파일명/매핑을 flower_type 기준으로 통일 (추천)**
- 이미지 파일명을 `SUNFLOWER.png`, `HYDRANGEA.png`처럼 **flower_type 기준**으로 변경
- `FLOWER_TYPE_TO_IMAGE_SRC` 매핑(또는 함수) 하나로 UI에서 바로 사용

2) **현 파일명을 유지하고 2단 매핑 적용**
- `flower_type → dominantEmotion → /assets/flowers/{dominantEmotion}.png`
- 단, flower_type만으로 바로 이미지가 안 나오므로 매핑 단계가 한 번 더 생긴다.

**완료 기준(예)**
- 앨범 카드/꽃 상세 모달에서 이모지 대신 이미지가 노출된다.
- 향후 이미지 교체(해상도/디자인 변경)가 코드 수정 없이 에셋 교체/매핑 수정으로 가능하다.

---

## 2. 안정화/품질 (중요, 하지만 상황에 따라)

### 2.1 타입 정리 (any 제거)

**현재 상태**
- 일부 UI 로직에서 `flower_type` 접근에 `(flower as any).flower_type` 형태가 존재한다.

**권장**
- `FlowerRow` 타입(`src/types/database.ts`)에 `cycle_start_at` 등을 반영하거나,
- 꽃 앨범 조회용 타입을 별도로 정의해 `any`를 제거한다.

**완료 기준**
- TypeScript에서 `any` 캐스팅 없이 `flower_type`을 안전하게 참조한다.

---

### 2.2 감정 분포 집계 성능 개선 (데이터 증가 대비)

**현재 상태**
- `getEmotionDistribution`은 감정 레코드를 조회한 뒤 클라이언트에서 카운트를 집계한다.

**선택 옵션**
- Supabase에서 `group by main_emotion` 집계를 수행하도록 변경
- 감정 누적 통계 테이블(`emotion_stats`) 도입

**완료 기준**
- 감정 기록이 많아져도 개화 시점 집계가 느려지지 않는다.

---

## 3. 테스트/운영 체크 (추천)

### 3.1 시나리오 기반 수동 테스트 수행

- 문서: `docs/FLOWERS_TEST_2026-03-16.md` 기준으로
  - 대표 감정 선택
  - 동률 우선순위
  - current_cycle
  - fallback(WILD_FLOWER)
  - UI 노출
  을 실제로 1~2회 개화까지 검증한다.

### 3.2 디버그 편의성 강화 (선택)

- 개화 로그에 `distribution` 요약(상위 2~3개) 정도만 추가해도 분석이 쉬워진다.
  - 단, 개인정보/과도한 로그 노출은 주의.

---

## 4. 한 줄 요약

지금 기능은 연결되어 있으니, 다음으로는 **(1) `cycle_start_at` 자동 세팅으로 current_cycle을 실효성 있게 만들고, (2) 이모지 대신 실제 이미지로 UI를 교체**하는 작업을 진행하면 완성도가 가장 크게 올라간다.

