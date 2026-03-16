## 2026-03-16 Flowers 확장 로직 테스트 체크리스트

이 문서는 2026-03-16에 추가된 **감정 분포 기반 flower_type 결정 로직 및 앨범/꽃 상세 UI 확장**을 검증하기 위한 테스트 시나리오를 정리한 것이다.

---

## 1. 기본 개화 + flower_type 저장 확인

### 목적
- 개화 시 `flowers.flower_type` 이 실제로 설정되는지 확인한다.

### 시나리오
1. **준비**
   - 새 계정이거나, 아직 개화되지 않은 계정을 사용한다.
2. **감정 기록 여러 번 하기**
   - 의도적으로 특정 감정만 반복 선택:
     - 예: `JOY`(기쁨) 위주로 10~20일 정도 기록.
   - 중간에 하루 정도는 다른 감정(예: `BLUE`)도 섞어 넣는다. (분포가 단일 감정만은 아니게)
3. **개화 발생시키기**
   - 연속 기록/포인트가 조건을 만족해서 최소 1번 개화가 발생할 때까지 기록을 이어간다.
4. **DB 확인**
   - Supabase SQL 콘솔 혹은 클라이언트에서 아래 쿼리 실행:
   ```sql
   select
     id,
     user_id,
     flower_type,
     growth_percent,
     is_bloomed,
     bloomed_at
   from public.flowers
   where user_id = 'YOUR_USER_ID_HERE';
   ```

### 기대 결과
- `is_bloomed = true` 인 row 가 존재한다.
- 해당 row 의 `flower_type` 이 **비어 있지 않고**, 감정 분포(예: JOY 위주였다면 `SUNFLOWER`)와 일관된 값으로 설정된다.

체크:
- [ ] 개화 후 `flowers.is_bloomed = true` 확인
- [ ] 개화 후 `flowers.flower_type` 이 null/빈 문자열이 아님
- [ ] 감정 기록 패턴과 `flower_type` 이 자연스럽게 매칭됨

---

## 2. 감정 분포 → 대표 감정 선택 로직 확인

### 목적
- `getEmotionDistribution` + `pickDominantEmotion` + `mapEmotionToFlowerType`가 의도한 감정을 선택하는지 확인한다.

### 시나리오 1: 단일 감정 우세
1. 특정 계정으로 로그인.
2. 아래 패턴으로 기록:
   - `JOY` 감정으로 5회 기록
   - `BLUE` 감정으로 2회 기록
   - 나머지 감정은 기록하지 않음.
3. 개화 조건을 만족할 때까지 추가로 기록해 개화를 발생시킨다.
4. 브라우저 콘솔에서 `[updateFlowerGrowth] 개화 달성 🌸` 로그 확인.

체크:
- [ ] 로그에 `dominantEmotion: 'JOY'` 로 찍히는지
- [ ] 로그에 `flowerType: 'SUNFLOWER'` 로 찍히는지
- [ ] DB 의 `flowers.flower_type = 'SUNFLOWER'` 인지

### 시나리오 2: 동률 + 우선순위
1. 다른 계정(또는 flowers 초기화된 유저)로 테스트.
2. 아래 패턴으로 기록:
   - `JOY` 3회, `EXCITED` 3회 (나머지는 0회)
3. 개화 발생 시점까지 기록을 이어간다.
4. 콘솔 로그 및 DB 확인.

체크:
- [ ] `JOY` 와 `EXCITED` 카운트가 같은 상황에서
- [ ] `EMOTION_PRIORITY = ['JOY', 'EXCITED', ...]` 를 따르므로 `dominantEmotion = 'JOY'` 인지
- [ ] `flowerType = 'SUNFLOWER'` 인지

---

## 3. current_cycle 범위 동작 확인

### 목적
- `range: 'current_cycle'` 가 이전 꽃 사이클의 감정 기록을 제외하고, **현재 사이클만** 기준으로 분포를 계산하는지 확인한다.

### 시나리오
1. **첫 번째 꽃 사이클**
   - `JOY` 위주로 여러 번 기록해 개화 발생.
   - 개화 후 `flowers.flower_type` 이 `SUNFLOWER` 인지 확인.
2. **두 번째 꽃 사이클**
   - 개화 이후부터는 `BLUE`(우울) 위주로 기록.
   - 중간에 다른 감정이 조금 섞여 있어도 `BLUE`가 가장 많도록 패턴 구성.
   - 다시 개화 조건을 만족할 때까지 기록.
3. 두 번째 개화 후:
   - 로그/DB를 확인해 `flower_type` 이 `BLUE_ROSE` 에 해당하는 값으로 나오는지 본다.

체크:
- [ ] 첫 번째 개화: `flower_type` 이 JOY 계열(`SUNFLOWER`)로 설정됨
- [ ] 두 번째 개화: `flower_type` 이 BLUE 계열(`BLUE_ROSE`)로 설정됨
- [ ] 두 번째 개화 시 첫 번째 사이클의 감정 기록은 영향이 없는 것으로 보임

---

## 4. flower_type 결정 실패 시 fallback 동작 확인

### 목적
- 감정 코드가 이상하거나, 분포 조회 중 에러가 나도 **개화 자체는 유지되고** `flower_type` 은 `'WILD_FLOWER'` 로 fallback 되는지 확인한다.

### 시나리오 (가능한 경우)
1. 테스트 환경에서 일부 `emotions.main_emotion` 을 의도적으로 깨진 값(예: `'UNKNOWN_EMOTION'`)으로 수정.
2. 또는 Supabase 권한/네트워크 이슈를 시뮬레이션하여 `getEmotionDistribution` 호출이 실패하게 만든다.
3. 그 상태에서 개화 조건을 만족시켜 개화를 발생시킨다.

체크:
- [ ] 개화 후에도 `flowers.is_bloomed = true`, `bloomed_at` 이 정상적으로 찍혀 있는지
- [ ] `flowers.flower_type = 'WILD_FLOWER'` 로 설정되는지
- [ ] 콘솔/로그에 `개화 시 꽃 타입 결정 실패` 라는 에러 로그가 남는지
- [ ] `[updateFlowerGrowth] 개화 달성 🌸 dominantEmotion=UNKNOWN flowerType=WILD_FLOWER` 처럼 fallback 정보가 찍히는지

---

## 5. 마이페이지 앨범 카드 UI 확인

### 목적
- 앨범 모달에서 **flower_type 기반 이모지/이름**이 정상적으로 반영되는지 확인한다.

### 시나리오
1. 최소 1개 이상 개화된 상태의 계정으로 로그인.
2. MyPage 진입 → `감정꽃 앨범` 카드 클릭.
3. 앨범 모달에서 리스트를 확인:
   - 각 아이템의 꽃 이모지가 `flower_type` 과 맞는지 확인.
   - 예:
     - `SUNFLOWER` → 🌻
     - `BLUE_ROSE` → 🌀
4. 옛날 데이터(개발 초기) 등으로 `flower_type` 이 없거나 예상치 못한 값인 경우도 확인.

체크:
- [ ] 정상 `flower_type` 에서 이모지가 `FLOWER_TYPE_TO_EMOJI` 와 일치
- [ ] `flower_type` 가 null/이상한 값인 경우에도 🌸 로 fallback
- [ ] 타이틀(씨앗 이름) 및 날짜는 기존과 동일하게 보인다

---

## 6. 꽃 상세 모달 UI 확장 확인

### 목적
- 꽃 상세 모달에서 **꽃 이름, 개화 문장**이 `flower_type` 기반으로 노출되는지 확인한다.

### 시나리오
1. 앨범 모달에서 개화된 꽃 아이템 하나를 탭해 **꽃 상세 모달**을 연다.
2. 다음 항목을 순서대로 확인:
   - `개화 날짜` 행: 기존과 동일 (`curFlower.date`).
   - `꽃 이름` 행:
     - 내용: `이모지 + 꽃 이름` (예: `🌻 햇살꽃`).
   - `개화 문장` 행:
     - 해당 꽃 타입에 맞는 한국어 문장.
3. fallback 케이스:
   - `flower_type` 가 null/이상한 값인 꽃을 일부러 만들어서,
   - 아래 문구가 나오는지 확인:
     - 이모지: `🌸`
     - 꽃 이름: `두근꽃`
     - 문장: `이 시기의 나는, 설렘으로 하루를 보냈어요`

체크:
- [ ] 정상 `flower_type` 에서 꽃 이름/문장이 `FLOWER_TYPE_TO_NAME_KO` / `FLOWER_TYPE_TO_BLOOM_CAPTION` 과 일치
- [ ] fallback 시 벚꽃/두근꽃/설렘 문장이 노출
- [ ] PNG 저장/공유하기/메시지 저장 동작은 이전과 동일하게 동작

---

## 7. 회귀 테스트(간단)

### 목적
- 새로운 로직 추가가 기존 기능에 영향을 주지 않았는지 빠르게 확인한다.

체크:
- [ ] 감정 기록 저장/수정/삭제가 기존과 동일하게 동작
- [ ] 홈 화면 게이지/꽃 성장 표시가 여전히 정상
- [ ] 개화 알림(성장 레벨 알림) 발생 시 내용이 이전과 동일
- [ ] PNG 저장, 공유하기, 한 줄 메시지 저장이 모두 정상 완료

---

## 8. 메모

- **이미지 에셋 교체 예정**
  - 현재 꽃 이미지는 `FLOWER_TYPE_TO_EMOJI` 에 정의된 **이모지**를 사용한다.
  - 이후 실제 이미지 리소스가 준비되면:
    - 이 매핑을 이미지 URL/에셋 키로 교체하고,
    - MyPage 앨범/꽃 상세 모달에서 이모지 텍스트를 이미지 컴포넌트로 대체한다.
- 이 테스트 문서는 추후 이미지 교체 및 Flower 앨범 UX 개선 작업의 **기본 회귀 체크리스트**로 재사용할 수 있다.

