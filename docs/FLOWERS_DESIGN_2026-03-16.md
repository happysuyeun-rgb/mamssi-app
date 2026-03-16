## 2026-03-16 Flowers 확장 설계 정리

이 문서는 2026-03-16에 진행한 **꽃 개화 로직 확장 및 시각화 개선 작업** 내용을 정리한다.

---

## 1. 개화 시 flower_type 자동 결정 로직

### 1.1 개요

- 개화(bloom) 시점에 유저의 감정 기록 분포를 기반으로 **`flower_type`을 자동 결정**한다.
- 감정 기록은 `public.emotions` 테이블의 `main_emotion` 컬럼(기존 `emotion_type`)에 저장된 **Emotion 코드** (`JOY`, `CALM`, `ANXIOUS` 등)를 사용한다.

### 1.2 사용 상수 (`src/constants/flowerMap.ts`)

1. **감정 우선순위 배열 (동률 처리용)**

```ts
export const EMOTION_PRIORITY: EmotionCode[] = [
  'JOY',
  'EXCITED',
  'PROUD',
  'GROWTH',
  'CALM',
  'COMPLEX',
  'ANXIOUS',
  'BLUE',
  'TIRED',
  'ANGER',
];
```

2. **감정 → 꽃 타입 매핑**

- `JOY` → `SUNFLOWER` (햇살꽃)
- `CALM` → `HYDRANGEA` (고요꽃)
- `ANXIOUS` → `LAVENDER` (숨결꽃)
- `BLUE` → `BLUE_ROSE` (새벽꽃)
- `ANGER` → `RED_TULIP` (불꽃)
- `TIRED` → `CACTUS` (버팀꽃)
- `EXCITED` → `CHERRY_BLOSSOM` (두근꽃)
- `GROWTH` → `SPROUT` (싹꽃)
- `PROUD` → `MAGNOLIA` (빛꽃)
- `COMPLEX` → `WILD_FLOWER` (얽힘꽃)

3. **꽃 타입 → 꽃 이름(한국어) 매핑**

- `SUNFLOWER` → `햇살꽃`
- `HYDRANGEA` → `고요꽃`
- `LAVENDER` → `숨결꽃`
- `BLUE_ROSE` → `새벽꽃`
- `RED_TULIP` → `불꽃`
- `CACTUS` → `버팀꽃`
- `CHERRY_BLOSSOM` → `두근꽃`
- `SPROUT` → `싹꽃`
- `MAGNOLIA` → `빛꽃`
- `WILD_FLOWER` → `얽힘꽃`

4. **꽃 타입 → 개화 문구 매핑**

- `SUNFLOWER` → `"이 시기의 나는, 기쁨으로 가득했어요"`
- `HYDRANGEA` → `"이 시기의 나는, 차분히 나를 바라봤어요"`
- `LAVENDER` → `"이 시기의 나는, 불안했지만 잘 버텼어요"`
- `BLUE_ROSE` → `"이 시기의 나는, 조용히 슬픔을 품었어요"`
- `RED_TULIP` → `"이 시기의 나는, 뜨겁게 감정을 느꼈어요"`
- `CACTUS` → `"이 시기의 나는, 지쳐도 포기하지 않았어요"`
- `CHERRY_BLOSSOM` → `"이 시기의 나는, 설렘으로 하루를 보냈어요"`
- `SPROUT` → `"이 시기의 나는, 조금씩 자라고 있었어요"`
- `MAGNOLIA` → `"이 시기의 나는, 스스로가 자랑스러웠어요"`
- `WILD_FLOWER` → `"이 시기의 나는, 복잡한 감정 속에 있었어요"`

5. **꽃 타입 → 임시 이미지 이모지 매핑**  
   (※ 실제 이미지 파일로 교체 예정 – 이모지는 임시용)

- `SUNFLOWER` → `🌻`
- `HYDRANGEA` → `💜`
- `LAVENDER` → `🪻`
- `BLUE_ROSE` → `🌀`
- `RED_TULIP` → `🌷`
- `CACTUS` → `🌵`
- `CHERRY_BLOSSOM` → `🌸`
- `SPROUT` → `🌱`
- `MAGNOLIA` → `🤍`
- `WILD_FLOWER` → `💐`

---

## 2. Flower Logic 유틸 함수 (`src/lib/flowerLogic.ts`)

### 2.1 getEmotionDistribution(userId, supabase, range?)

**역할**

- `public.emotions` 테이블에서 `user_id = userId` 인 레코드를 조회하고,
- `main_emotion` 기준으로 감정별 카운트를 집계해 분포를 반환한다.

**range 파라미터**

- `'all'` (기본값): 전체 기간
- `'current_cycle'`: `flowers.cycle_start_at` 이후 ~ 현재
  - `flowers` 테이블의 `cycle_start_at` 컬럼 사용 (없으면 `'all'` 과 동일하게 전체 조회)

**반환값 예시**

```ts
{
  JOY: 3,
  CALM: 1,
  BLUE: 2,
}
```

### 2.2 pickDominantEmotion(distribution)

**역할**

- 분포 객체에서 **카운트가 가장 높은 감정 코드**를 선택한다.
- 동률인 경우 `EMOTION_PRIORITY` 순서에 따라 하나를 고른다.
- 감정 기록이 없거나 분포가 비어 있으면 기본값으로 `'JOY'` 를 반환한다.

### 2.3 mapEmotionToFlowerType(dominantEmotion)

**역할**

- `EMOTION_TO_FLOWER_TYPE` 상수를 참조해 대표 감정 코드를 꽃 타입으로 변환한다.
- 매핑에 없는 값이 들어오면 기본값으로 `'WILD_FLOWER'` 를 반환한다.

---

## 3. 개화 시 flower_type 자동 결정 (services 레벨)

### 3.1 수정 위치

- 파일: `src/services/flowers.ts`
- 함수: `updateFlowerGrowth(userId, emotionDate, isNewRecord, isPublic)`

### 3.2 기존 성장/개화 로직 (변경 없음)

- 성장 포인트:
  - 개인 기록: +5pt
  - 공개 기록: +10pt
  - `growth_percent` 를 0~100pt 포인트로 사용
- 개화 조건:
  - `newGrowthPoints >= 100` **또는** `20일 연속 기록`
  - 이전에 `is_bloomed = false` 인 경우에만 개화
- 위 성장/개화 판정 로직, `isNewRecord` / `isPublic` 처리, 연속 일수 계산 등은 **수정하지 않음**.

### 3.3 개화 시점 flower_type 결정 플로우

개화 조건이 충족된 경우 (`shouldBloom === true`)에만 추가 로직을 수행한다.

1. `getEmotionDistribution(userId, supabase, 'current_cycle')`
   - 현재 꽃 사이클(`flowers.cycle_start_at` 이후) 기준 감정 분포 조회.
2. `pickDominantEmotion(distribution)`
   - 분포에서 최빈 감정(동률 시 우선순위 기준)을 대표 감정으로 선택.
3. `mapEmotionToFlowerType(dominantEmotion)`
   - 대표 감정을 꽃 타입(예: `SUNFLOWER`)으로 변환.
4. `flowers` 업데이트 시 `flower_type` 컬럼을 함께 업데이트.
5. 로그 출력:

```ts
console.log('[updateFlowerGrowth] 개화 달성 🌸', {
  userId,
  growthPoints: newGrowthPoints,
  consecutiveDays,
  reason: newGrowthPoints >= 100 ? '100pt 달성' : '20일 연속 기록',
  dominantEmotion,
  flowerType,
});
```

### 3.4 에러 및 fallback 처리

- `getEmotionDistribution` / `pickDominantEmotion` / `mapEmotionToFlowerType` 호출은 `try-catch` 로 감싼다.
- 에러 발생 시:
  - 개화(`is_bloomed=true`, `bloomed_at 설정`)는 **정상적으로 계속 진행**한다.
  - `flower_type` 은 `'WILD_FLOWER'` 로 fallback 설정.
  - 에러 내용은 `logger.error('개화 시 꽃 타입 결정 실패', ...)` 로 로깅.

---

## 4. 꽃 상세 모달 & 앨범 화면 확장 (UI)

### 4.1 AlbumItem 구조 확장 (`MyPage` 내 로컬 타입)

기존:

- `id`, `title`, `date`, `water`, `emoji`, `message?`

추가 필드:

- `flowerType: string | null`
- `flowerName: string` (한글 이름)
- `bloomCaption: string` (개화 문장)

### 4.2 앨범 데이터 매핑 (`MyPage`의 loadAlbum 효과 내부)

1. `fetchBloomedFlowers(user.id)` 로 개화된 꽃 목록 조회.
2. 각 `flower` 에 대해:
   - `flower_type` 읽기
   - `getFlowerMetaByType(flower_type)` 헬퍼로 메타 정보 계산:

```ts
const { emoji, flowerName, bloomCaption } = getFlowerMetaByType(flower.flower_type);
```

3. `AlbumItem` 으로 변환 시:
   - `emoji`: `FLOWER_TYPE_TO_EMOJI[flowerType]`
   - `flowerName`: `FLOWER_TYPE_TO_NAME_KO[flowerType]`
   - `bloomCaption`: `FLOWER_TYPE_TO_BLOOM_CAPTION[flowerType]`

### 4.3 fallback 규칙

`flower_type` 이 없거나 매핑이 실패한 경우:

- 이모지: `🌸`
- 꽃 이름: `두근꽃`
- 개화 문장: `"이 시기의 나는, 설렘으로 하루를 보냈어요"`

이 fallback 은 **꽃 상세 모달 · 앨범 카드 모두 동일하게** 사용한다.

### 4.4 꽃 상세 모달 UI 변경

- 위치: `MyPage` 하단의 “꽃 상세 모달” 섹션

추가/변경 요소:

1. **개화 날짜**
   - 기존 유지: `개화 날짜` 행 (`curFlower.date` 표시)
2. **꽃 이름 행 추가**
   - 내용: `이모지 + 꽃 이름`
   - 예: `🌻 햇살꽃`
3. **개화 문장 행 추가**
   - 내용: 해당 `flower_type` 의 개화 문구
   - 예: `이 시기의 나는, 기쁨으로 가득했어요`

> PNG 저장, 공유하기, 메시지 저장 등의 기능 및 레이아웃 구조는 변경하지 않음.  
> 단지 텍스트 데이터(꽃 이름/문장)만 추가로 노출.

### 4.5 앨범 리스트 카드 UI

- 기존: 이모지 + 제목(씨앗 이름/기본 문구) + 날짜
- 변경:
  - **이모지**: `flower_type` 기반 임시 이모지 (없으면 기존 벚꽃 이모지)
  - 제목: 기존 씨앗 이름/기본 타이틀 유지
  - 날짜: 기존 그대로

---

## 5. 이미지 교체에 대한 메모

- 현재 꽃 시각화는 **임시로 이모지 기반** 표현을 사용한다.
- 실제 디자인이 준비되면:
  - `FLOWER_TYPE_TO_EMOJI` 자리에 **이미지 URL 또는 에셋 키**를 매핑하고,
  - 꽃 상세 모달 및 앨범 카드에서
    - 이모지 텍스트 대신 이미지 컴포넌트(`img` 또는 커스텀 `<FlowerIcon type={...} />`)로 교체할 계획이다.
- 이번 설계/구현에서는 **이모지 ↔ 이미지 교체가 쉽도록**:
  - flower_type → 이모지/이름/문구 의 매핑을 **중앙집중 상수(`flowerMap.ts`)** 로 분리했고,
  - UI에서는 `flowerType` 하나만으로 모든 정보를 얻을 수 있게 만들어 두었다.

---

## 6. 한 줄 요약

개화 시점에 `emotions.main_emotion` 분포를 분석하여 **대표 감정을 뽑고 → 꽃 타입을 자동 결정 → `flowers.flower_type` 에 저장**하며, 마이페이지의 앨범/꽃 상세 모달은 이 `flower_type` 을 기반으로 **꽃 이름, 개화 문장, 임시 이모지**를 보여주도록 확장했다. (이모지는 이후 실제 이미지 에셋으로 교체 예정)

