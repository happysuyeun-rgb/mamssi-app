## Flowers 성장 · 개화 · 앨범 설계서

이 문서는 **감정 기록 → 꽃 성장 → 개화 완료 → 앨범 노출**까지의 전체 플로우를 정리한 설계 문서이다.  
구현 언어나 프레임워크에 관계없이 이해 가능한 도메인/로직 레벨로 기술한다.

---

## 1. 도메인 개요 (공통)

- **감정 기록(Emotion Record)**: 유저가 남기는 하루 단위 감정 일기 / 기록.
- **꽃(Flower)**: 감정 기록 누적 상태를 시각적으로 표현한 개체.
- **성장도(Growth Percent)**: 꽃이 얼마나 자랐는지 나타내는 값 (보통 0~100).
- **개화(Bloom)**: 성장도가 임계치(예: 100%)에 도달했을 때의 상태.
- **앨범(Album)**: 개화가 완료된 꽃들을 모아 조회하는 히스토리 뷰.

**핵심 원칙**

- 감정 **“신규 기록”** 이 있을 때만 꽃이 성장한다.
- **하루에 한 번만 성장** 가능(같은 날 수정/중복 기록은 성장 없음).
- 성장도가 임계치 이상이면 **개화 상태**로 전환하고, 필요 시 **앨범에 보존**한다.
- 홈 화면의 “나의 정원”은 현재 진행 중인 꽃의 성장 상태를 사용해 시각화한다.

---

## 2. 데이터 모델 (공통)

### 2.1 `flowers` (진행 중인/대표 꽃)

유저 1명당 1개(또는 소수)의 “진행 중인 꽃” 상태를 관리하는 테이블.

- **필드**
  - `id`: PK
  - `user_id`: 유저 ID (유니크 제약 가능: `user_id` 당 1 row)
  - `flower_type`: 꽃 종류(시각/세계관용)
  - `growth_percent`: 현재 성장도 (기본 0)
  - `is_bloomed`: 개화 여부 (기본 false)
  - `bloomed_at`: 개화 시각 (nullable)
  - `created_at`: row 생성 시각
  - `updated_at`: 마지막 갱신 시각

- **개화 상태 판정**
  - `growth_percent >= 100`
  - `is_bloomed = true`
  - `bloomed_at is not null`

위 세 조건을 동시에 만족하면 “개화 완료”로 본다.

### 2.2 `flower_albums` (개화 꽃 앨범) ※ 실제 스키마는 프로젝트 상황에 맞게

개화가 완료된 꽃을 스냅샷 형태로 저장해, 히스토리/앨범 화면에서 사용한다.  
(현재 DB에 없다면, 추후 확장용 개념으로만 두고 `flowers` 의 개화 row를 그대로 앨범처럼 사용해도 된다.)

- **예시 필드**
  - `id`: PK
  - `user_id`: 유저 ID
  - `flower_type`: 개화 당시 꽃 종류
  - `final_growth_percent`: 개화 시점 성장도 (보통 100 이상)
  - `bloomed_at`: 개화 시각
  - `created_at`: 앨범에 추가된 시각
  - `meta`: JSON (연속 기록 일수, 시즌, 문구 등 확장용)

---

## 3. 상태/단계 정의 (공통)

### 3.1 꽃 상태

1. **씨앗 / 초기 상태**
   - `growth_percent = 0`
   - `is_bloomed = false`
2. **성장 중**
   - `0 < growth_percent < 100`
   - 시각적으로 줄기/잎/봉오리 등이 점점 추가되는 구간
3. **개화 완료**
   - `growth_percent >= 100`
   - `is_bloomed = true`, `bloomed_at is not null`

### 3.2 감정 기록 관점

1. **신규 감정 기록 (New Record)**
   - 해당 날짜의 첫 감정 기록
   - 성장 **+1 (또는 정의된 규칙)** 적용
2. **같은 날 감정 수정 (Update Record)**
   - 기존 감정 기록을 수정
   - 성장 **변화 없음**
3. **다음 날 신규 감정 기록**
   - 새로운 날짜에 첫 감정 기록
   - 성장 추가 **+1**

---

## 4. 현재 구현 방식 요약

이 섹션은 **현재(또는 1차 구현)** 기준의 성장·개화·앨범 로직을 정리한다.  
제안 방식(감정 분포 기반 꽃 결정)은 9장 이후에서 별도로 다룬다.

### 4.1 핵심 로직

#### 4.1.1 `ensureFlowerRow(userId)`

**역할**: 해당 유저의 꽃 row가 없으면 생성하고, 있으면 그대로 사용한다.

- **플로우**
  1. `flowers` 에서 `user_id = userId` 인 row 조회
  2. 존재하지 않을 경우:
     - `flower_type` 기본값과 함께 row 생성
     - `growth_percent = 0`, `is_bloomed = false`
  3. 이미 존재할 경우:
     - 그대로 사용

- **관련 로그 (예시)**
  - `[ensureFlowerRow] flowers row 생성 시도`
  - `[ensureFlowerRow] flowers row 존재`
  - `[ensureFlowerRow] flowers row 생성 성공`
  - `[ensureFlowerRow] flowers 생성 실패`

> 실제 호출 위치: `Record.tsx` 의 `updateFlowerGrowth` 내부, `useHomeData` 에서 flowers 조회 실패 시 fallback 등.

#### 4.1.2 `updateFlowerGrowth(userId, { isNewRecord, hasEmotionToday })`

감정 기록 이후, 꽃 성장/개화를 처리하는 핵심 함수.

- **입력**
  - `userId`: 현재 유저 ID
  - `isNewRecord`: 이번 요청이 **신규 기록인지**(true) / **수정인지**(false)
  - `hasEmotionToday`: 오늘 이미 감정 기록이 있는지 여부

- **규칙 개념**
  1. 항상 `ensureFlowerRow(userId)` 를 먼저 호출해 row 를 보장한다.
  2. 성장 증가 조건:
     - `isNewRecord === true`
     - `hasEmotionToday === false`
  3. 위 조건을 만족하지 못하면:
     - `growth_percent` 는 변경하지 않고, 필요 시 `updated_at` 만 갱신한다.

- **의사 코드**

```text
ensureFlowerRow(userId)

if (!isNewRecord) {
  // 수정 모드
  로그: [updateFlowerGrowth] UPDATE 모드 - 성장 증가 없음
  return
}

if (hasEmotionToday) {
  // 오늘 이미 기록 존재
  로그: [updateFlowerGrowth] 오늘 이미 기록 존재 - 성장 증가 없음
  return
}

// 여기까지 오면 성장 +1 (또는 정의된 값)
oldGrowth = growth_percent
newGrowth = oldGrowth + 1

growth_percent = newGrowth
updated_at = now()

if (newGrowth >= 100 && !is_bloomed) {
  is_bloomed = true
  bloomed_at = now()
  로그: [updateFlowerGrowth] 개화 달성! 🌸

  // (옵션) 앨범 스냅샷 생성
  createFlowerAlbumEntry(userId, { flower_type, newGrowth, bloomed_at })
} else {
  로그: [updateFlowerGrowth] 성장 업데이트 성공
}
```

- **관련 로그 (예시)**
  - `[updateFlowerGrowth] 성장 업데이트 성공`
  - `[updateFlowerGrowth] UPDATE 모드 - 성장 증가 없음`
  - `[updateFlowerGrowth] 오늘 이미 기록 존재 - 성장 증가 없음`
  - `[updateFlowerGrowth] flowers 업데이트 실패`
  - `[updateFlowerGrowth] 개화 달성! 🌸`

---

## 5. 개화 → 앨범 반영 (현재 방식)

### 5.1 개화 조건

`updateFlowerGrowth` 실행 후 다음 조건을 만족하면 **개화 이벤트**로 본다.

- `oldGrowth < 100`
- `newGrowth >= 100`

이 경우 `flowers` row 를 다음과 같이 갱신한다.

- `growth_percent = newGrowth`
- `is_bloomed = true`
- `bloomed_at = now()`

### 5.2 `createFlowerAlbumEntry(userId, ...)`

**역할**: 개화가 발생한 꽃을 앨범(히스토리) 테이블에 스냅샷 형태로 기록한다.

- **플로우**
  1. `flowers` 업데이트가 성공한 이후, 개화 이벤트가 감지되면:
     - `flower_albums`(또는 동등 역할 테이블)에 새 row 생성:
       - `user_id`
       - `flower_type`
       - `final_growth_percent = growth_percent`
       - `bloomed_at`
       - `created_at = now()`
  2. 동일 꽃에 대한 중복 앨범 생성 방지:
     - 하나의 `flowers.id` 에 대해 앨범 레코드를 1개만 허용하거나,
     - 이미 `is_bloomed = true` & 앨범이 생성된 경우 재생성하지 않도록 조건 추가.

- **관련 로그 (예시)**
  - `[FlowerAlbum] 앨범 레코드 생성 시도`
  - `[FlowerAlbum] 앨범 레코드 생성 성공`
  - `[FlowerAlbum] 앨범 레코드 생성 실패`

---

## 6. 화면/플로우 관점 (현재 방식)

### 6.1 홈 화면 (나의 정원)

- **데이터 소스**
  - `useHomeData` 등에서:
    - `flowers` 테이블에서 현재 유저의 row 조회
    - 필요 시 `ensureFlowerRow` 를 fallback 으로 호출

- **표현**
  - `growth_percent` 로 게이지/원형 차트 비율 결정
  - `growth_percent` 구간에 따라 꽃 일러스트 단계 변경
  - `is_bloomed === true` 이면:
    - “꽃이 피었어요” 상태 / 배지 / 이펙트 표시

- **업데이트 타이밍**
  1. 감정 저장 성공
  2. `updateFlowerGrowth` 실행 및 성공
  3. `refetchHomeData()` 호출
  4. `useHomeData` 의 `flower` state 업데이트
  5. 홈 컴포넌트 리렌더 → 시각화 즉시 반영

### 6.2 앨범 화면

- **목적**
  - 지금까지 개화한 꽃들의 히스토리를 감상하는 화면.

- **데이터 소스**
  - `flower_albums` 테이블
  - 또는 `flowers` 에서 `is_bloomed = true` 인 row 를 조회 (현재 구조에 따라 선택)
  - 정렬: `bloomed_at DESC` (최근 개화 순)

- **UI 예시**
  - 카드 리스트:
    - 꽃 썸네일 (타입/컬러)
    - 개화 날짜 (`bloomed_at`)
    - 부가 텍스트(“OO번째 꽃” 등)
  - 디테일 뷰:
    - 개화 당시 정보(연속 기록 일수, 시즌, 문구 등)

---

## 7. 개화 완료 → 앨범 이동 사용자 여정 (현재 방식)

### 7.1 타임라인

1. 유저가 감정을 **신규로 기록**한다.
2. 감정 저장 성공 후 `updateFlowerGrowth` 호출.
3. `oldGrowth < 100` → `newGrowth >= 100` 이 되면:
   - `flowers` 에서 개화 처리 (`is_bloomed = true`, `bloomed_at = now()`).
   - (옵션) `createFlowerAlbumEntry` 호출로 앨범에 기록.
4. `updateFlowerGrowth` 성공 시:
   - `refetchHomeData()` 호출.
5. 홈 화면 재진입 또는 현재 홈 상태에서:
   - “꽃이 피었어요!” 라는 축하 모달/배너 노출.

### 7.2 UI 설계 (예시)

- **개화 축하 모달/배너**
  - 메시지:
    - “축하해요! 오늘 나의 정원에 꽃이 피었어요 🌸”
  - 액션 버튼:
    - `앨범에서 보기` → 앨범 화면으로 이동 (예: `/album`)
    - `나중에 보기` → 모달 닫기

- **앨범 화면 진입 후**
  - 방금 개화한 꽃을 상단에 위치시키거나,
  - `?highlight=<albumId>` 등의 파라미터로 하이라이트 처리 가능.

---

## 8. 에러/엣지 케이스 체크 포인트 (공통)

- **성장도가 안 오를 때**
  - `isNewRecord` 플래그가 올바른지 (`true` 여야 증가).
  - `hasEmotionToday` 계산이 정상인지 (오늘 첫 기록인지).
  - RLS/권한 이슈로 `flowers` 업데이트가 실패하지 않았는지.

- **개화는 되었는데 앨범에 안 보일 때**
  - `createFlowerAlbumEntry` 가 실제로 호출/성공했는지.
  - 동일 꽃에 대해 중복 방지 로직이 과하게 막고 있지 않은지.

- **홈/앨범 데이터 불일치**
  - `refetchHomeData` 가 `updateFlowerGrowth` 이후에 호출되는지.
  - 캐시/상태 관리 문제로 이전 값이 남아 있지 않은지.

---

## 9. 제안 방식: 감정 분포 기반 꽃 종류 결정 로직

### 9.1 문제 정의

- 감정 카테고리는 **8가지**이며, 유저는 감정 기록마다 이 8가지 중 하나를 선택한다.
- 꽃은 개화 시점에 **하나의 `flower_type`** 만 가진다.
- 목표:
  - 개화가 완료될 때, 유저의 감정 기록 분포를 분석해
  - **가장 비중이 큰 감정을 대표 감정으로 선택**하고
  - 이 대표 감정에 따라 **꽃 종류(`flower_type`)를 자동으로 결정**한다.

### 9.2 감정 데이터 소스

#### 9.2.1 감정 기록 테이블

기본 가정: 감정 기록 테이블(예: `emotion_records`)에 다음 정보가 저장된다.

- `id`
- `user_id`
- `recorded_at` (날짜/시간)
- `emotion_type` (8가지 중 하나, enum 또는 문자열)

이 테이블을 기반으로 감정 분포를 계산한다.

#### 9.2.2 누적 통계 테이블/컬럼 (옵션)

조회 성능을 위해 유저별 감정 누적 카운트를 별도로 유지할 수 있다.

- 예: `emotion_stats` (또는 `users` 확장 컬럼)
  - `user_id`
  - `count_emotion_1`, `count_emotion_2`, …, `count_emotion_8`
  - `total_count`

감정 기록이 추가될 때마다 해당 카운트를 1씩 증가시키고, `total_count` 도 증가시킨다.  
개화 시에는 이 카운트를 이용해 비율을 계산한다.

---

### 9.3 감정 분포 계산 범위

꽃 한 송이가 “어떤 기간의 나” 를 반영할지에 따라 범위를 선택한다.

#### 9.3.1 전체 누적 기반

- 지금까지의 **모든 감정 기록**을 대상으로 분포 계산.
- 장점: 구현이 가장 단순하고 설명이 쉽다.
  - 예: “지금까지 나의 정원에서 가장 많이 느낀 감정은 ○○입니다.”
- 단점: 오래된 감정이 최근 변화보다 크게 반영될 수 있다.

#### 9.3.2 현재 꽃 사이클 기반 (권장)

- “이 꽃이 자란 기간” 만을 대상으로 분포 계산.
- 기준:
  - 이전 꽃이 개화된 시점 이후부터
  - 현재 꽃이 개화되는 시점까지의 감정 기록.
- 구현 방법 예시:
  - `flowers` 또는 별도 테이블에 `cycle_start_at` 저장.
  - 감정 분포 조회 시 `recorded_at BETWEEN cycle_start_at AND bloomed_at` 조건으로 집계.
- 장점:
  - 해당 꽃이 “최근 한 사이클 동안의 나” 를 대표하게 된다.

#### 9.3.3 최근 N일 / 최근 N건 기반 (확장 옵션)

- 예: 최근 30일, 최근 50건의 감정 기록만을 대상으로 계산.
- “최근의 나” 에 집중하고 싶을 때 도입 가능.

> 1차 설계에서는 **현재 꽃 사이클 기반**을 기본으로 한다.  
> (MVP 단계에서는 전체 누적 기반으로 시작한 뒤, 추후 사이클 기반으로 확장 가능)

---

### 9.4 대표 감정 선택 알고리즘

1. 지정한 기간(예: 현재 꽃 사이클)의 감정 기록을 조회한다.
2. 감정 타입별로 카운트를 구한다.
   - `count[emotion_1]`, …, `count[emotion_8]`
   - `total = Σ count[emotion_i]`
3. 각 감정의 비율을 계산한다.
   - `ratio[emotion_i] = count[emotion_i] / total`
4. `ratio` 가 가장 큰 감정 `dominantEmotion` 을 선택한다.

#### 9.4.1 동률 처리 규칙

여러 감정이 동일한 비율/카운트를 가질 수 있으므로, 다음과 같은 규칙을 둔다.

- **우선순위 테이블 방식 (기본)**
  - 미리 감정 우선순위를 정의해 둔다.
  - 예:
    - `PRIORITY = [JOY, EXPECTATION, CALM, SADNESS, FEAR, ANGER, TIRED, ETC]`
  - 최댓값을 가진 감정이 여러 개라면, `PRIORITY` 배열에서 더 앞에 위치한 감정을 선택한다.

- **최근성 기준 (확장 옵션)**
  - 동률인 감정들에 대해 최근 N일/N건에서 더 자주 등장한 감정을 선택하는 2차 규칙을 둘 수 있다.

---

### 9.5 감정 → 꽃 타입 매핑

대표 감정 하나가 정해지면, 이를 꽃 타입으로 변환하는 매핑이 필요하다.

예시 매핑 (프로덕션에서는 세계관/디자인에 맞게 조정):

- `JOY` → `SUNFLOWER`
- `SADNESS` → `BLUE_ROSE`
- `ANGER` → `RED_TULIP`
- `FEAR` → `LAVENDER`
- `EXPECTATION` → `CHERRY_BLOSSOM`
- `CALM` → `WHITE_LILY`
- `TIRED` → `CACTUS`
- `ETC` → `WILD_FLOWER`

이 매핑은 코드/DB 어디에서든 관리 가능하다.

- 코드 상 상수 객체로 관리
- DB 테이블(`emotion_flower_map`) 로 관리 후 조회

---

### 9.6 개화 시점 로직 통합

개화 로직은 `updateFlowerGrowth` 에서 `oldGrowth < 100` 이고 `newGrowth >= 100` 이 되는 순간에 실행된다.  
이 시점에 감정 분포 기반 꽃 종류 결정을 추가한다.

#### 9.6.1 의사 코드

```text
ensureFlowerRow(userId)

// ... 성장 조건 체크 후 newGrowth 계산 ...

if (oldGrowth < 100 && newGrowth >= 100) {
  // 1. 감정 분포 계산
  emotionDistribution = getEmotionDistribution(userId, {
    range: 'current_cycle' // 또는 'all', 'recent_30_days' 등
  })

  // 2. 대표 감정 선택
  dominantEmotion = pickDominantEmotion(emotionDistribution, PRIORITY)

  // 3. 감정 → 꽃 타입 매핑
  flowerType = mapEmotionToFlowerType(dominantEmotion)

  // 4. flowers 업데이트
  flowers.flower_type = flowerType
  flowers.is_bloomed = true
  flowers.bloomed_at = now()

  로그: [updateFlowerGrowth] 개화 달성! 🌸 dominantEmotion=..., flowerType=...

  // 5. 앨범 스냅샷 생성 시에도 동일 flower_type 사용
  createFlowerAlbumEntry(userId, {
    flower_type: flowerType,
    final_growth_percent: newGrowth,
    bloomed_at: flowers.bloomed_at
  })
} else {
  // 개화 전이면 기존 성장 로직만 수행
  flowers.growth_percent = newGrowth
  flowers.updated_at = now()
}
```

#### 9.6.2 보조 함수 역할 정의

- `getEmotionDistribution(userId, { range })`
  - 지정된 기간 동안의 감정 기록을 조회해 감정별 카운트/비율을 계산.
- `pickDominantEmotion(distribution, PRIORITY)`
  - 가장 큰 비율을 가진 감정을 선택.
  - 동률이 있을 경우 `PRIORITY` 순서에 따라 결정.
- `mapEmotionToFlowerType(dominantEmotion)`
  - 감정 → 꽃 타입 매핑 테이블을 조회해 최종 `flower_type` 반환.

---

### 9.7 설계 요약

- 개화가 발생하는 순간, 해당 유저의 감정 기록(8가지) 분포를 계산하고,
- 그 중 **가장 비율이 높은 감정**을 대표 감정으로 뽑는다.
- 이 대표 감정을 사전에 정의된 매핑을 통해 **하나의 꽃 종류(`flower_type`)** 로 변환한다.
- 이렇게 결정된 `flower_type` 으로 `flowers` 와 `flower_albums` 를 업데이트함으로써,
  - “이 꽃은 이 시기의 감정 중 **가장 많이 느낀 감정의 얼굴**이다” 라는 스토리텔링을 제공한다.

---

## 10. 감정 분포 기반 로직 적용을 위한 준비 사항

### 10.1 데이터/스키마 준비

1. **감정 기록 테이블 구조 확인**
   - 감정 기록용 테이블(예: `emotion_records`)에 최소한 다음 컬럼이 존재해야 한다.
     - `user_id`
     - `recorded_at` (날짜/시간)
     - `emotion_type` (8가지 중 하나, enum 또는 문자열)
   - 현재 구조에 `emotion_type` 이 없다면:
     - 컬럼 추가 + 8가지 감정을 표현하는 enum/코드를 정의해야 한다.

2. **감정 분포 계산 범위 결정**
   - 아래 중 하나를 선택한다.
     - 전체 기간: 지금까지 모든 기록 기준
     - 현재 꽃 사이클: 이전 개화 시점 이후 ~ 이번 개화 시점까지
     - 최근 N일 / 최근 N건
   - 권장: **현재 꽃 사이클 기반**
     - 이를 위해 `flowers` 또는 별도 테이블에 `cycle_start_at` 같은 컬럼을 두어,
       - 해당 꽃 사이클의 시작 시점을 기록한다.

3. **(옵션) 감정 누적 통계 테이블**
   - 성능/단순화를 위해 유저별 감정 카운트를 누적하는 테이블을 둘 수 있다.
   - 예: `emotion_stats`
     - `user_id`
     - `count_emotion_1` ~ `count_emotion_8`
     - `total_count`
   - 감정 기록 생성 시:
     - 해당 감정 카운트 및 `total_count` 를 +1 업데이트.
   - 개화 시:
     - 이 테이블을 이용해 빠르게 분포를 계산할 수 있다.

---

### 10.2 감정 → 꽃 타입 매핑 정의

1. **8가지 감정 정의**
   - 서비스에서 사용하는 감정 8가지를 명시적으로 정의한다.
     - 예시: `JOY`, `SADNESS`, `ANGER`, `FEAR`, `EXPECTATION`, `CALM`, `TIRED`, `ETC`

2. **감정 우선순위 배열 (동률 처리용)**
   - 동률 발생 시 어떤 감정을 우선할지 정하는 배열을 만든다.
   - 예:
     - `PRIORITY = [JOY, EXPECTATION, CALM, SADNESS, FEAR, ANGER, TIRED, ETC]`

3. **감정 → 꽃 타입 매핑 테이블**
   - 각 감정에 대응되는 꽃 종류를 정의한다.
   - 예:
     - `JOY` → `SUNFLOWER`
     - `SADNESS` → `BLUE_ROSE`
     - `ANGER` → `RED_TULIP`
     - `FEAR` → `LAVENDER`
     - `EXPECTATION` → `CHERRY_BLOSSOM`
     - `CALM` → `WHITE_LILY`
     - `TIRED` → `CACTUS`
     - `ETC` → `WILD_FLOWER`
   - 위치:
     - 코드 상 상수 객체로 관리하거나,
     - DB 테이블(`emotion_flower_map`)로 두고 조회하는 방식 중 선택.

---

### 10.3 서비스/함수 설계 준비

1. **감정 분포 계산 함수**
   - 함수 시그니처 예:
     - `getEmotionDistribution(userId, { range }): EmotionDistribution`
   - 역할:
     - 지정된 기간(`range`) 동안의 감정 기록을 조회해,
       - 감정별 카운트 & 비율을 계산해 반환.

2. **대표 감정 선택 함수**
   - 함수 시그니처 예:
     - `pickDominantEmotion(distribution, PRIORITY): EmotionType`
   - 역할:
     - 분포에서 최댓값 감정을 찾고,
     - 동률이 있을 경우 `PRIORITY` 배열에 따라 하나를 선택.

3. **감정 → 꽃 타입 변환 함수**
   - 함수 시그니처 예:
     - `mapEmotionToFlowerType(dominantEmotion): FlowerType`
   - 역할:
     - 대표 감정을 꽃 타입으로 매핑.
     - 내부에서 상수 매핑 또는 DB 조회 사용.

4. **개화 로직과의 결합 포인트 정리**
   - `updateFlowerGrowth` 에서 개화 조건(`oldGrowth < 100 && newGrowth >= 100`) 이 충족되는 지점에,
     - `getEmotionDistribution` → `pickDominantEmotion` → `mapEmotionToFlowerType`
     - 순서대로 호출할 수 있도록 의존성과 모듈 구조를 정리한다.

---

### 10.4 테스트/검증 시나리오 준비

아래 시나리오를 만족하는 테스트 데이터를 준비하면, 로직 검증이 수월하다.

1. **단일 감정 우세 케이스**
   - A 유저: `JOY` 위주 기록 → 개화 시 `JOY` 기반 꽃 타입 선택.
2. **다른 감정 우세 케이스**
   - B 유저: `SADNESS` / `FEAR` 위주 기록 → 해당 감정 기반 꽃 타입 선택.
3. **동률 케이스**
   - C 유저: `JOY` 와 `EXPECTATION` 카운트 동일 → `PRIORITY` 에 따라 어느 감정이 선택되는지 확인.
4. **감정 기록 적은 케이스**
   - D 유저: 감정 기록 수가 매우 적은 경우에도 분포 계산/개화 로직이 문제없이 동작하는지 확인.

---

## 11. 한 줄 요약

**신규 감정 기록**이 성공하면 `updateFlowerGrowth` 가 유저의 `flowers` row 를 보장하고, 하루에 한 번씩 성장도를 올리며, 임계치에 도달해 개화하는 순간에는 감정 기록 분포를 분석해 대표 감정을 뽑고 이를 기반으로 꽃 종류를 결정한 뒤, (옵션) 앨범 스냅샷을 남기고, `refetchHomeData` 로 홈의 “나의 정원”과 앨범 화면에 이 상태를 즉시 반영하는 흐름으로 설계되어 있다.


