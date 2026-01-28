# 이미지 첨부 후 저장 실패 문제 해결 가이드

## 문제 상황
- 이미지 첨부 후 저장 시 400 Bad Request 에러 발생
- `[Record] 저장 실패` 에러 로그 확인

## 원인 분석

### 가능한 원인들:
1. **DB 스키마 문제**: `emotions` 테이블에 `image_url` 컬럼이 없거나 NOT NULL 제약이 있을 수 있음
2. **RLS 정책 문제**: `image_url` 필드에 대한 INSERT/UPDATE 권한이 없을 수 있음
3. **Payload 형식 문제**: `image_url` 값이 올바르지 않을 수 있음

## 해결 방법

### 1단계: DB 스키마 확인 및 수정

Supabase Dashboard > SQL Editor에서 다음 스크립트 실행:

```sql
-- check_emotions_image_url.sql 파일 실행
```

또는 직접 실행:

```sql
-- 1. image_url 컬럼 존재 확인
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'emotions' 
  AND column_name = 'image_url';

-- 2. image_url 컬럼이 없으면 추가
ALTER TABLE emotions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. image_url 컬럼이 NOT NULL이면 NULL 허용으로 변경
ALTER TABLE emotions 
ALTER COLUMN image_url DROP NOT NULL;
```

### 2단계: RLS 정책 확인

```sql
-- emotions 테이블의 INSERT/UPDATE 정책 확인
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'emotions'
  AND (cmd = 'INSERT' OR cmd = 'UPDATE');
```

RLS 정책이 `image_url`을 포함하지 않으면 다음 정책 추가:

```sql
-- INSERT 정책 (이미 있으면 수정)
CREATE POLICY "Users can insert their own emotions with image_url"
ON emotions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책 (이미 있으면 수정)
CREATE POLICY "Users can update their own emotions with image_url"
ON emotions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 3단계: 코드 수정 확인

다음 파일들이 수정되었는지 확인:

1. **src/hooks/useEmotions.ts**:
   - `addEmotion`: `image_url`이 `null`이어도 포함되도록 수정
   - `updateEmotion`: `image_url`이 `null`이어도 포함되도록 수정

2. **src/pages/Record.tsx**:
   - 이미지 업로드 후 URL 검증 로직 확인
   - payload에 `image_url` 포함 확인

### 4단계: 테스트

1. **이미지 없이 저장 테스트**:
   - 감정 선택
   - 내용 입력 (5자 이상)
   - 이미지 없이 저장
   - ✅ 성공해야 함

2. **이미지 1개 첨부 후 저장 테스트**:
   - 감정 선택
   - 내용 입력
   - 이미지 1개 첨부
   - 저장
   - ✅ 성공해야 함

3. **이미지 2개 첨부 후 저장 테스트**:
   - 감정 선택
   - 내용 입력
   - 이미지 2개 첨부
   - 저장
   - ✅ 성공해야 함 (첫 번째 이미지만 저장됨)

4. **기록 수정 시 이미지 첨부 테스트**:
   - 기존 기록 수정
   - 이미지 첨부
   - 수정 완료
   - ✅ 성공해야 함

## 디버깅 방법

### 콘솔 로그 확인

저장 시도 시 다음 로그들을 확인:

1. `[Record] 이미지 업로드 시작` - 이미지 업로드 시작 여부
2. `[Record] 이미지 업로드 성공` - 업로드 성공 및 URL
3. `[Record] 저장 payload 검증` - 최종 payload 구조
4. `[addEmotion] Supabase insert 호출 직전` - DB 전송 직전 payload
5. `[addEmotion] insert 실패 - 상세 에러` - 에러 상세 정보

### 에러 코드 확인

400 에러 발생 시 다음 정보 확인:
- `code`: Supabase 에러 코드
- `message`: 에러 메시지
- `details`: 상세 정보
- `hint`: 해결 힌트

### 일반적인 에러 코드:
- `23502`: NOT NULL 제약 조건 위반 → `image_url` 컬럼이 NOT NULL인 경우
- `42501`: RLS 정책 위반 → RLS 정책 확인 필요
- `23503`: Foreign Key 제약 조건 위반 → `user_id` 문제
- `400`: Bad Request → payload 형식 문제

## 추가 확인 사항

1. **Supabase 프로젝트 설정**:
   - Supabase URL이 올바른지 확인
   - API Key가 올바른지 확인
   - 네트워크 연결 상태 확인

2. **이미지 업로드 확인**:
   - Storage 버킷 `emotion-images` 존재 확인
   - RLS 정책 확인
   - 파일 크기 제한 확인 (10MB)

3. **브라우저 콘솔**:
   - 네트워크 탭에서 실제 요청 확인
   - 요청 payload 확인
   - 응답 에러 확인

## 예상 결과

수정 후:
- ✅ 이미지 없이 저장 가능
- ✅ 이미지 1개 첨부 후 저장 가능
- ✅ 이미지 2개 첨부 후 저장 가능 (첫 번째만 저장)
- ✅ 기록 수정 시 이미지 첨부 가능
- ✅ 기록 상세 화면에서 이미지 표시

## 문제가 계속되면

1. Supabase Dashboard에서 직접 INSERT 테스트:
```sql
INSERT INTO emotions (user_id, main_emotion, content, image_url)
VALUES (
  auth.uid(),
  '기쁨',
  '테스트 내용',
  'https://example.com/image.jpg'
);
```

2. 에러 메시지 전체를 캡처하여 공유

3. 네트워크 탭의 실제 요청/응답 확인
