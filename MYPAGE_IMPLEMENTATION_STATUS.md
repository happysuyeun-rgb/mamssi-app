# 마이페이지 기능 구현 상태 정리

## 1. 프로필 사진 업로드

### ✅ 구현 상태: **완료**

#### 구현 내용
- **Storage Bucket**: `profile-images` 사용
  - 파일: `src/utils/profileImageUpload.ts`
  - Bucket 이름: `'profile-images'`
  - 파일명 형식: `{userId}.{ext}` (jpg, jpeg, png, webp)
  - 최대 파일 크기: 5MB

- **저장 로직**: 
  - `uploadProfileImage()`: Storage에 업로드 후 public URL 반환
  - `deleteProfileImage()`: 기존 이미지 삭제
  - `user_settings.profile_url` 컬럼에 URL 저장
  - `updateSettings({ profile_url })` 사용

- **연동 상태**:
  - ✅ Storage 업로드 구현됨
  - ✅ `user_settings.profile_url` 저장됨
  - ✅ 프로필 설정 모달에서 업로드/삭제 가능

#### 확인 필요 사항
- [ ] Supabase Dashboard에서 `profile-images` bucket 생성 여부 확인
- [ ] Storage RLS 정책 설정 확인 (현재 코드에는 없음)

#### 권장 사항
```sql
-- Storage bucket 생성 (Supabase Dashboard 또는 SQL)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책 (public 읽기, 본인만 업로드/삭제)
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 2. 알림 설정

### ⚠️ 구현 상태: **부분 구현 (UI만 존재, 백엔드 미연동)**

#### 현재 상태
- **UI**: 알림 설정 모달 존재
  - 공감 알림 토글 (`settings.emp`)
  - 기록 루틴 시간 (`settings.time`)
  - **로컬 스토리지만 사용** (`lsGet/lsSet`)

- **DB 스키마**: 
  - `user_settings` 테이블에 알림 관련 컬럼 **없음**
  - 현재 컬럼: `nickname`, `mbti`, `profile_url`, `seed_name`, `lock_type`, `lock_value`

- **알림 트리거**: 
  - `src/services/notifications.ts`에 알림 생성 로직 존재
  - 사용자 설정 기반 필터링/스케줄링 **없음**
  - 알림은 즉시 생성되며, 사용자 설정과 무관

#### 문제점
1. 알림 설정이 로컬 스토리지에만 저장됨 (기기 간 동기화 안 됨)
2. 실제 알림 발송 로직이 사용자 설정을 고려하지 않음
3. 기록 루틴 시간 설정이 실제 스케줄링과 연결되지 않음

#### 권장 사항

**옵션 A: 기능 비활성화 (권장)**
```tsx
// MyPage.tsx
<div className="card" onClick={() => {
  notify.info('알림 설정 기능은 준비 중이에요. 곧 만나요!', 'ℹ️');
}}>
  <div>
    <div className="tt">알림 설정</div>
    <div className="sub" style={{ fontSize: 11, color: 'var(--ms-ink-muted)' }}>
      준비 중
    </div>
  </div>
  <div className="chev">›</div>
</div>
```

**옵션 B: DB 연동 구현**
1. `user_settings` 테이블에 컬럼 추가:
   ```sql
   ALTER TABLE public.user_settings
     ADD COLUMN IF NOT EXISTS notification_enabled boolean DEFAULT true,
     ADD COLUMN IF NOT EXISTS notification_routine_time time DEFAULT '21:00';
   ```

2. 알림 서비스에 필터링 로직 추가
3. 스케줄링 시스템 구현 (Edge Functions 또는 외부 서비스)

---

## 3. 감정꽃 앨범

### ⚠️ 구현 상태: **Mock 데이터 (로컬 스토리지만 사용)**

#### 현재 상태
- **데이터 소스**: 로컬 스토리지 (`localStorage`, 키: `'ms_album'`)
- **초기 데이터**: 하드코딩된 mock 데이터 3개
  ```typescript
  const seed: AlbumItem[] = [
    { id: 'a1', title: '잎 너므해', date: '2025-11-05', water: 1, emoji: '🌸', message: '따뜻한 하루' },
    { id: 'a2', title: '두번저장안됨', date: '2025-11-03', water: 1, emoji: '🌷', message: '' },
    { id: 'a3', title: '봄비', date: '2025-10-22', water: 2, emoji: '🌼', message: '소중한 기억' }
  ];
  ```

- **DB 연동**: **없음**
  - `flowers` 테이블과 연동되지 않음
  - `emotions` 테이블과 연동되지 않음

#### 문제점
1. 앨범 데이터가 기기 간 동기화되지 않음
2. 실제 개화 데이터(`flowers.is_bloomed = true`)와 연동되지 않음
3. 앨범 항목 생성/삭제가 DB에 반영되지 않음

#### 권장 사항

**옵션 A: flowers 테이블 기반으로 변경 (권장)**
```typescript
// flowers 테이블에서 is_bloomed = true인 레코드 조회
const { data: bloomedFlowers } = await supabase
  .from('flowers')
  .select('*')
  .eq('user_id', userId)
  .eq('is_bloomed', true)
  .order('bloomed_at', { ascending: false });

// AlbumItem으로 변환
const album = bloomedFlowers.map(flower => ({
  id: flower.id,
  title: flower.seed_name || '나의 씨앗',
  date: flower.bloomed_at?.split('T')[0] || flower.created_at.split('T')[0],
  water: Math.floor(flower.growth_percent / 10), // 공감 수 추정
  emoji: getEmojiByLevel(flower.flower_type),
  message: flower.bloom_caption || ''
}));
```

**옵션 B: 별도 앨범 테이블 생성**
```sql
CREATE TABLE public.flower_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  flower_id uuid REFERENCES public.flowers(id) ON DELETE CASCADE,
  title text NOT NULL,
  caption text, -- 한 줄 메시지
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, flower_id)
);
```

---

## 4. 마이페이지 전체 기능 구현/미구현 목록

### ✅ 완전 구현된 기능

| 기능 | 구현 상태 | DB 연동 | 비고 |
|------|----------|---------|------|
| **프로필 설정** |
| 닉네임 수정 | ✅ 완료 | ✅ `user_settings.nickname` | |
| MBTI 변경 | ✅ 완료 | ✅ `user_settings.mbti` | |
| 프로필 사진 업로드 | ✅ 완료 | ✅ `user_settings.profile_url` | Storage bucket 필요 |
| 프로필 사진 삭제 | ✅ 완료 | ✅ `user_settings.profile_url` | |
| **화면 잠금** |
| 잠금 활성화/비활성화 | ✅ 완료 | ✅ `user_settings.lock_type` | |
| 패턴 잠금 설정 | ✅ 완료 | ✅ `user_settings.lock_value` (해시) | |
| PIN 잠금 설정 | ✅ 완료 | ✅ `user_settings.lock_value` (해시) | |
| **감정기록 모아보기** |
| JSON 다운로드 | ✅ 완료 | ✅ `emotions` 테이블 | |
| CSV 다운로드 | ✅ 완료 | ✅ `emotions` 테이블 | |
| **계정 관리** |
| 로그아웃 | ✅ 완료 | - | |
| 회원탈퇴 | ✅ 완료 | - | `/delete-account` 페이지로 이동 |

### ⚠️ 부분 구현된 기능

| 기능 | 구현 상태 | DB 연동 | 문제점 | 권장 조치 |
|------|----------|---------|--------|----------|
| **알림 설정** | ⚠️ UI만 | ❌ 없음 | 로컬 스토리지만 사용, 실제 알림과 무관 | "준비 중" 표시 또는 DB 연동 |
| **감정꽃 앨범** | ⚠️ Mock | ❌ 없음 | 로컬 스토리지만 사용, `flowers` 테이블 미연동 | `flowers` 테이블 기반으로 변경 |

### ❌ 미구현 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| **소셜 계정 관리** | ❌ 미구현 | "준비 중이에요" 메시지만 표시 |
| **고객 문의** | ⚠️ 기본 구현 | `mailto:` 링크만 사용, 실제 티켓 시스템 없음 |

---

## 5. 권장 조치 사항

### 즉시 조치 필요

1. **알림 설정**: "준비 중" 표시 또는 기능 비활성화
2. **감정꽃 앨범**: `flowers` 테이블 연동 또는 별도 테이블 생성
3. **프로필 이미지 Storage**: Bucket 및 RLS 정책 확인/설정

### 향후 개선

1. 알림 설정 DB 연동 및 스케줄링 시스템
2. 앨범 데이터 DB 마이그레이션
3. 고객 문의 티켓 시스템 연동

