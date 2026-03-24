## 마음씨 노출 메시지 정리

> 최종 업데이트: 2026-03-24


이 문서는 현재 마음씨 앱에서 사용자에게 노출되는 **알림/토스트/모달/알럿 메시지**를 정리한 것이다.  
범위:
- `notify` 기반 토스트/배너/모달
- 알림 센터(NotificationCenter)용 메시지 템플릿
- `toast()` 및 `window.alert()` 로 직접 노출되는 메시지

> UI 라벨/버튼 텍스트 등 일반 문구는 포함하지 않고, **알림 성격의 메시지**만 정리한다.

---

## 1. 알림 센터 메시지 템플릿 (`NOTIFICATION_MESSAGES`)

소스: `src/config/notificationMessages.ts`

- **signup_welcome**
  - 아이콘: `🤝`
  - 제목: `가입을 환영해요`
  - 메시지: `마음씨에 오신 걸 환영해요! 첫 씨앗을 심어보세요.`
  - 카테고리: `onboarding`

- **seed_received**
  - 아이콘: `🌱`
  - 제목: `씨앗을 받았어요`
  - 메시지: `새로운 감정꽃 여정이 시작됐어요.`
  - 카테고리: `onboarding`

- **routine_streak_active**
  - 아이콘: `🔄`
  - 제목: `연속 기록 중이에요`
  - 메시지: `하루씩 쌓여가고 있어요. 기대돼요!`
  - 카테고리: `routine`

- **routine_streak_broken**
  - 아이콘: `💭`
  - 제목: `기록이 끊어졌어요`
  - 메시지: `기록이 하루 쉬어졌어요. 조금씩 다시 시작해볼까요?`
  - 카테고리: `routine`

- **record_saved**
  - 아이콘: `📝`
  - 제목: `감정 기록을 저장했어요`
  - 메시지: `오늘의 감정이 기록이 조용히 정원에 저장되었어요.`
  - 카테고리: `record`

- **record_with_image**
  - 아이콘: `📷`
  - 제목: `사진과 함께 기록했어요`
  - 메시지: `감정과 함께 따뜻한 순간이 저장됐어요.`
  - 카테고리: `record`

- **first_record**
  - 아이콘: `✨`
  - 제목: `첫 기록을 남겼어요`
  - 메시지: `첫 기록이 저장되었어요. 감정 정원에 씨앗이 자랐어요.`
  - 카테고리: `record`

- **record_updated**
  - 아이콘: `🖊️`
  - 제목: `기록이 수정됐어요`
  - 메시지: `기록이 새로운 마음에 맞게 업데이트되었어요.`
  - 카테고리: `record`

- **record_deleted**
  - 아이콘: `🗑️`
  - 제목: `기록을 삭제했어요`
  - 메시지: `기록 한 장을 조용히 흘려보냈어요.`
  - 카테고리: `record`

- **record_visibility_changed**
  - 아이콘: `🌐`
  - 제목: `공개 설정이 바뀌었어요`
  - 메시지: `기록의 공개 범위가 변경됐어요.`
  - 카테고리: `record`

- **report_received**
  - 아이콘: `🚨`
  - 제목: `신고 접수 안내`
  - 메시지: `신고 접수가 되었어요. 완전하게 살펴볼게요.`
  - 카테고리: `forest`

- **like_received**
  - 아이콘: `💧`
  - 제목: `새로운 공감`
  - 메시지: `누군가가 내 감정에 공감해줬어요.`
  - 카테고리: `forest`

- **like_three**
  - 아이콘: `💧`
  - 제목: `3개의 공감이 도착했어요`
  - 메시지: `따뜻한 마음들이 모이고 있어요.`
  - 카테고리: `forest`

- **like_five**
  - 아이콘: `💧`
  - 제목: `5개의 공감이 모였어요`
  - 메시지: `당신의 감정이 많은 위로가 되었어요.`
  - 카테고리: `forest`

- **likes_total**
  - 아이콘: `💧`
  - 제목: `공감이 쌓이고 있어요`
  - 메시지: `지금까지 총 N개의 공감을 받았어요.`
  - 카테고리: `forest`

- **post_selected_best**
  - 아이콘: `🏅`
  - 제목: `인기 글로 선정됐어요`
  - 메시지: `많은 공감이 모이면서 BEST 글이 되었어요.`
  - 카테고리: `forest`

- **report_resolved**
  - 아이콘: `🛡️`
  - 제목: `안전센터 처리 완료`
  - 메시지: `신고 내용이 처리되었어요.`
  - 카테고리: `forest`

- **report_rejected**
  - 아이콘: `🛡️`
  - 제목: `신고가 반려되었어요`
  - 메시지: `정책 기준에 따라 해당 내용은 유지돼요.`
  - 카테고리: `forest`

- **growth_level_1**
  - 아이콘: `🌱`
  - 제목: `1단계 새싹`
  - 메시지: `첫 감정의 씨앗이 자랐어요.`
  - 카테고리: `growth`

- **growth_level_2**
  - 아이콘: `🌿`
  - 제목: `2단계 줄기`
  - 메시지: `축하합니다, 줄기가 자라났어요.`
  - 카테고리: `growth`

- **growth_level_3**
  - 아이콘: `🌿`
  - 제목: `3단계 꽃봉오리`
  - 메시지: `감정이 피어나기 직전이에요. 봉오리가 맺혔어요.`
  - 카테고리: `growth`

- **growth_level_4**
  - 아이콘: `🌸`
  - 제목: `4단계 반쯤 떨린 꽃봉오리`
  - 메시지: `이제 곧 감정의 꽃이 피어납니다.`
  - 카테고리: `growth`

- **growth_level_5**
  - 아이콘: `🌸`
  - 제목: `5단계 개화`
  - 메시지: `축하합니다! 감정의 꽃이 환짝 피었어요.`
  - 카테고리: `growth`

- **bloom_caption_saved**
  - 아이콘: `✏️`
  - 제목: `꽃 한 줄 기록 완료`
  - 메시지: `감정꽃 앨범에 문구가 저장됐어요.`
  - 카테고리: `flower`

- **bloom_exported**
  - 아이콘: `📤`
  - 제목: `꽃을 내보냈어요`
  - 메시지: `감정꽃을 이미지로 저장했어요.`
  - 카테고리: `flower`

- **routine_7days**
  - 아이콘: `🔄`
  - 제목: `루틴 달성 리마인드`
  - 메시지: `7일 연속 기록 달성! 감정의 꽃이 피고 있어요.`
  - 카테고리: `routine`

- **routine_30days**
  - 아이콘: `🔄`
  - 제목: `30일 연속 기록 달성!`
  - 메시지: `멋진 루틴이에요. 마음을 잘 돌보고 있어요.`
  - 카테고리: `routine`

- **backup_required**
  - 아이콘: `💾`
  - 제목: `백업이 필요해요`
  - 메시지: `데이터 백업을 추천드려요.`
  - 카테고리: `system`

- **backup_completed**
  - 아이콘: `💾`
  - 제목: `백업이 완료됐어요`
  - 메시지: `데이터가 안전하게 저장됐어요.`
  - 카테고리: `system`

- **logged_out**
  - 아이콘: `🚪`
  - 제목: `로그아웃됐어요`
  - 메시지: `다시 로그인해 주세요.`
  - 카테고리: `account`

- **profile_photo_updated**
  - 아이콘: `🖼️`
  - 제목: `프로필이 바뀌었어요`
  - 메시지: `새로운 프로필 이미지가 저장됐어요.`
  - 카테고리: `profile`

- **nickname_updated**
  - 아이콘: `📝`
  - 제목: `닉네임이 바뀌었어요`
  - 메시지: `내 정보가 업데이트됐어요.`
  - 카테고리: `profile`

- **mbti_updated**
  - 아이콘: `🔤`
  - 제목: `MBTI가 변경됐어요`
  - 메시지: `내 성향 정보가 업데이트됐어요.`
  - 카테고리: `profile`

- **pin_enabled**
  - 아이콘: `🔐`
  - 제목: `PIN 잠금이 설정됐어요`
  - 메시지: `더 안전한 마음씨가 되었습니다.`
  - 카테고리: `profile`

- **pin_disabled**
  - 아이콘: `🔓`
  - 제목: `PIN 잠금이 해제됐어요`
  - 메시지: `기기 잠금이 해제됐어요.`
  - 카테고리: `profile`

- **pin_reset**
  - 아이콘: `🔒`
  - 제목: `PIN이 재설정됐어요`
  - 메시지: `새로운 잠금 번호가 설정됐어요.`
  - 카테고리: `profile`

- **flower_saved**
  - 아이콘: `🌸`
  - 제목: `개화 기록이 저장됐어요`
  - 메시지: `감정꽃 앨범에서 확인할 수 있어요.`
  - 카테고리: `flower`

- **flower_deleted**
  - 아이콘: `🗑️`
  - 제목: `앨범 기록 삭제됨`
  - 메시지: `해당 개화 기록이 삭제되었어요.`
  - 카테고리: `flower`

- **support_request_created**
  - 아이콘: `📮`
  - 제목: `문의가 등록됐어요`
  - 메시지: `최대한 빠르게 답변드릴게요.`
  - 카테고리: `support`

- **support_request_answered**
  - 아이콘: `📮`
  - 제목: `답변이 도착했어요`
  - 메시지: `문의하신 내용이 처리되었어요.`
  - 카테고리: `support`

- **account_deleted**
  - 아이콘: `❗`
  - 제목: `회원탈퇴가 진행됐어요`
  - 메시지: `모든 데이터가 삭제되었어요.`
  - 카테고리: `account`

- **account_rejoined**
  - 아이콘: `🔄`
  - 제목: `재가입됐어요`
  - 메시지: `다시 돌아와줘서 고마워요.`
  - 카테고리: `account`

- **ops_notice**
  - 아이콘: `📢`
  - 제목: `새로운 공지사항`
  - 메시지: `새로운 업데이트 내용을 확인해 주세요.`
  - 카테고리: `operations`

- **event_started**
  - 아이콘: `🎉`
  - 제목: `이벤트가 시작됐어요`
  - 메시지: `참여하고 보상을 받아보세요.`
  - 카테고리: `operations`

- **event_awarded**
  - 아이콘: `🎉`
  - 제목: `이벤트에 당첨됐어요`
  - 메시지: `축하해요! 선물이 도착했어요.`
  - 카테고리: `operations`

- **maintenance_notice**
  - 아이콘: `⚠️`
  - 제목: `시스템 점검 안내`
  - 메시지: `점검 중에는 일부 기능이 제한될 수 있어요.`
  - 카테고리: `system`

- **app_update_required**
  - 아이콘: `⬆️`
  - 제목: `업데이트가 필요해요`
  - 메시지: `최신 버전으로 업데이트해주세요.`
  - 카테고리: `system`

---

## 2. `notify` 기반 토스트/모달/배너 메시지

이 섹션은 `notify.success/info/warning/error/toast/modal/banner` 로 직접 호출되는 메시지를, **파일별로** 정리한다.

### 2.1 `src/pages/Home.tsx`

- `notify.banner` (배너)
  - (메시지 문자열은 코드에서 동적으로 구성될 수 있음 – 필요 시 개별 확인)
- `notify.dismissBanner('')`
  - 배너 닫기 용 (문구 없음)
- `notify.success('처음 오셨네요, 씨앗을 받아볼까요? 🌱', '✨')`
- `notify.success('다시 오셨네요! 오늘도 따뜻한 하루 되세요 🌿', '👋')`
- `notify.success('기록이 삭제되었어요', '✅')`

### 2.2 `src/components/home/TodayRecordCTA.tsx`

- `notify.modal({ ... })`
  - 모달 내 문구는 컴포넌트 내부에서 정의 (필요 시 해당 파일에서 상세 확인)

### 2.3 `src/routes/MyPage.tsx`

- `notify.error('로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.', '❌')`
- `notify.info('소셜 계정 관리는 준비 중이에요.', 'ℹ️')`

### 2.4 `src/pages/DeleteAccountPage.tsx`

- `notify.warning('탈퇴 확인을 체크해주세요.', '⚠️')`
- `notify.success('회원탈퇴가 완료되었어요. 이용해 주셔서 감사합니다.', '👋')`
- `notify.error('회원탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.', '❌')`

### 2.5 `src/pages/Forest.tsx`

- `notify.info('공감을 취소했어요', '💧')`
- `notify.success('공감 한방울이 전해졌어요.', '💧')`
- `notify.success('신고 접수가 되었어요. 이메일 앱에서 보내기를 눌러 주세요.', '✅')`
- 게시글 삭제 모달 내부:
  - `notify.success('게시글이 삭제되었어요.', '✅')`
- 공유/수정 관련 토스트:
  - `notify.toast({ type: 'success', message: '공감 링크를 공유했어요.' })`
  - `notify.toast({ type: 'error', message: '공유 중 문제가 발생했어요.' })`
  - `notify.toast({ type: 'warning', message: '원본 기록을 찾을 수 없어 수정할 수 없어요.' })`

### 2.6 `src/components/auth/SocialLoginButtons.tsx`

- `notify.error('구글 로그인에 실패했어요. 환경 설정을 확인해주세요.', '❌')`
- `notify.error('구글 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.', '❌')`
- `notify.error('Apple 로그인에 실패했어요. 환경 설정을 확인해주세요.', '❌')`
- `notify.error('Apple 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.', '❌')`
- (주석 처리) 카카오/기타 로그인 메시지:
  - `// notify.info('카카오 로그인은 준비 중이에요. 곧 만나요!', 'ℹ️');`
  - `// notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');`

### 2.7 `src/components/onboarding/OnboardingGuest.tsx`

- `notify.success('온보딩이 완료되었어요 🌱');`
- 특정 흐름에서:
  - `notify.info( ... )` (상세 문구는 파일 내부 확인)
- 오류:
  - `notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');`
- (다른 경로) `notify.success('온보딩이 완료되었어요 🌱');`

### 2.8 `src/components/home/WeeklyMoodWidget.tsx`

- `notify.warning('미래날짜는 기록할수 없어요!', '⚠️');`

### 2.9 `src/pages/ForestDetail.tsx`

- `notify.error('게시글을 불러오는데 실패했어요', '❌');`
- `notify.warning('로그인이 필요해요', '⚠️');`
- `notify.error('공감 처리에 실패했어요', '❌');`
- `notify.success('게시글이 삭제되었어요', '✅');`
- `notify.error('게시글 삭제에 실패했어요', '❌');`
- `notify.success('신고가 접수되었어요. 마음씨 팀이 확인할게요.', '✅');`
- `notify.error('신고 처리에 실패했어요', '❌');`

### 2.10 `src/pages/Record.tsx`

- `notify.warning('이미지는 최대 2개까지 첨부할 수 있어요', '⚠️');`
- `notify.warning( ... )` (중복 첨부 관련 상세 문구)
- `notify.warning('10MB 이하의 이미지만 첨부할 수 있어요', '⚠️');`
- `notify.warning('수정할 기록을 찾을 수 없어요', '⚠️');`
- `notify.error('기록을 불러오는 중 오류가 발생했어요', '❌');`
- `notify.warning('나만 보기 기록은 하루에 한 번만 작성할 수 있어요', '⚠️');`
- `notify.error('이미지 업로드에 실패했어요', '❌');`
- `notify.error('이미지 업로드는 성공했지만 URL을 가져오지 못했어요', '❌');`
- `notify.warning('내용을 5자 이상 입력해주세요', '⚠️');`
- `notify.error('기록 수정에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');`
- `notify.success('기록이 새로운 마음에 맞게 업데이트되었어요.', '💧');`
- `notify.error('기록이 저장되었지만 데이터를 불러오지 못했어요.', '❌');`
- 저장 성공 메시지:
  - `notify.success('공감숲에 기록이 저장되었어요. 다른 사람도 볼 수 있어요.', '💧');`
  - `notify.success('오늘의 감정이 기록이 조용히 정원에 저장되었어요.', '💧');`
- 특정 에러 케이스에서:
  - `notify.modal({ ... })` (모달 내 메시지는 해당 파일 참조)
  - `notify.error(userMessage, '❌');`

### 2.11 `src/hooks/useHomeData.ts`

- `notify.error('데이터를 불러오지 못했어요 🌧', '🌧');`

### 2.12 `src/components/home/FlowerBadge.tsx`

- `notify.warning('이번 달에는 씨앗 이름을 이미 수정했어요.', '⚠️');`
- `notify.warning('씨앗 이름을 입력해주세요.', '⚠️');`
- `notify.warning('씨앗 이름은 10자 이내로 입력해주세요.', '⚠️');`
- `notify.error('씨앗 이름 저장에 실패했어요: ${error.message}', '❌');`
- `notify.error('씨앗 이름 저장에 실패했어요. (데이터 없음)', '❌');`
- `notify.success('씨앗 이름이 "<value>"로 변경되었어요.', '✨');`
- `notify.error('씨앗 이름 저장에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');`

### 2.13 `src/providers/AuthProvider.tsx`

- `notify.success('반가워요! 마음,씨 정원으로 이동합니다 🌿');`
- `notify.error('로그인에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');` (여러 위치)
- `notify.info('카카오 로그인은 준비 중이에요. 곧 만나요!', 'ℹ️');`
- `notify.info('로그아웃되었어요.', '👋');`
- `notify.error('로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');`

### 2.14 `src/hooks/useActionGuard.ts`

- `notify.modal({ ... })` (로그인 필요 안내 모달)
- `notify.warning('로그인이 필요해요 💧', '💧');`

### 2.15 `src/pages/MyPage.tsx`

프로필/설정/문의 관련 다양한 메시지가 존재한다.

- 업로드/이미지 관련:
  - `notify.warning('이미 업로드 중이에요. 잠시만 기다려주세요.', '⏳');`
  - `notify.error('프로필 이미지 업로드에 실패했어요', '❌');`
  - `notify.error('프로필 이미지 URL 저장에 실패했어요', '❌');`
  - `notify.success('프로필 이미지가 적용되었어요', '✅');`
  - `notify.error('프로필 이미지 URL을 가져올 수 없어요', '❌');`
  - `notify.error('프로필 이미지 삭제에 실패했어요', '❌');`

- 프로필 텍스트/닉네임 관련:
  - `notify.warning('닉네임을 비워둘 수는 없어요', '⚠️');`
  - `notify.warning('닉네임은 1~12자로 입력해 주세요', '⚠️');`
  - `notify.warning('조금 더 다정한 닉네임으로 바꿔볼까요?', '⚠️');`
  - `notify.success('프로필이 업데이트되었습니다 ✨', '✨');`
  - `notify.error('닉네임 업데이트에 실패했어요', '❌');`
  - `notify.error('MBTI 업데이트에 실패했어요', '❌');`
  - `notify.success('기본 이모티콘 프로필로 변경했어요', '✅');`
  - `notify.success('프로필 정보를 저장했어요', '✅');`

- 설정/보안:
  - `notify.success('알림 설정을 저장했어요', '✅');`
  - `notify.success('JSON 파일을 다운로드했어요.', '✅');`
  - `notify.info('다운로드할 기록이 없어요.', 'ℹ️');`
  - `notify.success('CSV 파일을 다운로드했어요.', '✅');`
  - `notify.success('한 줄 메시지를 저장했어요.', '✅');`
  - `notify.warning('한 줄 메시지는 15자 이내로 입력해 주세요.', '⚠️');`
  - `notify.success('알림 설정을 저장했어요', '✅');`
  - `notify.error('잠금 설정 저장에 실패했어요', '❌');`

- 문의/피드백:
  - `notify.warning('이메일을 입력해주세요.', '⚠️');`
  - `notify.warning('문의 내용을 입력해주세요.', '⚠️');`
  - `notify.success('문의가 접수되었습니다.', '✅');`
  - `notify.error(result.error, '❌');`

- 기타:
  - `notify.info('소셜 계정 관리는 준비 중이에요.', 'ℹ️');`
  - `notify.error('로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.', '❌');`
  - `notify.info('꽃을 탭하면 상세 보기에서 저장/공유할 수 있어요', 'ℹ️');`

---

## 3. `toast()` 기반 간단 토스트 메시지

소스: `src/utils/toast.ts`, 다양한 route/page 에서 사용.

### 3.1 `src/routes/Record.tsx`

- `toast('오늘의 대표 감정을 하나 골라주세요');`
- `toast('감정을 5자 이상으로 적어주세요');`
- `toast('공감숲 공유 시 카테고리를 선택해주세요');`
- (또 다른 한 줄 메시지는 코드에서 직접 확인 가능)

### 3.2 `src/pages/Forest.tsx`

- `notify.toast({ type: 'success', message: '공감 링크를 공유했어요.' });`
- `notify.toast({ type: 'error', message: '공유 중 문제가 발생했어요.' });`
- `notify.toast({ type: 'warning', message: '원본 기록을 찾을 수 없어 수정할 수 없어요.' });`

---

## 4. `window.alert()` 기반 알럿 메시지

일부 오래된/간단 플로우에서 브라우저 기본 `alert` 으로 메시지를 보여준다.

### 4.1 `src/routes/Forest.tsx`

- `alert('💧 공감 한 방울이 전해졌어요');`
- `alert('🔗 글이 복사되었어요. 원하는 곳에 붙여넣기 해보세요');`
- `alert('🚩 신고가 접수되었어요. 안전하게 살펴볼게요');`

### 4.2 `src/components/home/WeeklyMoodWidget.tsx`

- `alert('기록 삭제에 실패했어요. 잠시 후 다시 시도해주세요.');`

### 4.3 `src/components/LockScreen.tsx`

- `alert('생체인증은 모바일 앱에서 지원됩니다.');`

### 4.4 `src/routes/Record.tsx`

- `alert('오늘의 대표 감정을 하나 골라주세요');`
- `alert('감정을 5자 이상으로 가볍게 남겨볼까요?');`
- `alert('공감숲에 심으려면 카테고리를 1개 이상 선택해 주세요');`
- 멀티라인 안내:
  - `alert('...')` (공유/저장 관련 복합 문구 – 파일에서 상세 확인 가능)

---

## 5. 비고 / 관리 정책 제안

- 현재 메시지는 **세 군데**에서 관리된다.
  1. `src/config/notificationMessages.ts` (알림 센터용 템플릿)
  2. 각 페이지/컴포넌트에서 `notify.*` 로 즉시 사용되는 메시지
  3. `toast()` / `alert()` 로 직접 노출되는 메시지
- 향후 일관된 카피/번역/톤 관리가 필요하다면:
  - 2, 3번 메시지도 모두 **공통 메시지 모듈**로 끌어올려 관리하는 것이 좋다.
  - `EXPOSED_MESSAGES.md` 는 그 통합 작업을 위한 기준 인벤토리로 사용 가능하다.

