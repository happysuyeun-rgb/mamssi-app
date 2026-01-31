-- user_settings.nickname 기본값 '마음씨' 설정
-- 앱에서 이미 초기 생성 시 nickname을 설정하므로, DB 기본값은 보조용입니다.

ALTER TABLE public.user_settings
  ALTER COLUMN nickname SET DEFAULT '마음씨';

-- 기존 NULL/빈값 레코드 업데이트 (선택 실행)
-- UPDATE public.user_settings
-- SET nickname = '마음씨'
-- WHERE nickname IS NULL OR trim(nickname) = '';
