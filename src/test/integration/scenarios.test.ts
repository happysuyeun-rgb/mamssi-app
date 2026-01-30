/**
 * 통합 시나리오 테스트
 * 신규/기존 계정의 주요 플로우를 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppError } from '@lib/errors';
import { logger } from '@lib/logger';
import * as emotionsService from '@services/emotions';
import * as settingsService from '@services/settings';
import * as usersService from '@services/users';
import * as flowersService from '@services/flowers';
import * as storageService from '@services/storage';

// Mock services
vi.mock('@services/emotions');
vi.mock('@services/settings');
vi.mock('@services/users');
vi.mock('@services/flowers');
vi.mock('@services/storage');
vi.mock('@lib/logger', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('통합 시나리오 테스트', () => {
  const mockUserId = 'test-user-id';
  const mockEmotionId = 'test-emotion-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('시나리오 1: 신규 계정 - 온보딩 완료 후 첫 기록 저장', () => {
    it('1-1. 사용자 생성 → 온보딩 완료 → 씨앗 생성 → 기록 저장', async () => {
      // 1. 사용자 생성
      const createUserResult = await usersService.createUser(mockUserId, 'test@example.com');
      expect(createUserResult.error).toBeNull();
      expect(createUserResult.data?.onboarding_completed).toBe(false);

      // 2. 온보딩 완료
      const completeOnboardingResult = await usersService.completeOnboarding(mockUserId);
      expect(completeOnboardingResult.error).toBeNull();
      expect(completeOnboardingResult.data?.onboarding_completed).toBe(true);

      // 3. 씨앗 생성 (flowers)
      const ensureFlowerResult = await flowersService.ensureFlowerRow(mockUserId);
      expect(ensureFlowerResult.error).toBeNull();
      expect(ensureFlowerResult.data?.is_bloomed).toBe(false);
      expect(ensureFlowerResult.data?.growth_percent).toBe(0);

      // 4. 기록 저장
      const createEmotionResult = await emotionsService.createEmotion({
        user_id: mockUserId,
        emotion_date: '2024-01-15',
        main_emotion: '기쁨',
        content: '오늘 기분이 좋아요',
      });
      expect(createEmotionResult.error).toBeNull();
      expect(createEmotionResult.data?.user_id).toBe(mockUserId);

      // 5. 성장 업데이트
      const updateGrowthResult = await flowersService.updateFlowerGrowth(
        mockUserId,
        '2024-01-15',
        true, // isNewRecord
        false // isPublic
      );
      expect(updateGrowthResult.error).toBeNull();
      expect(updateGrowthResult.data?.growth_percent).toBeGreaterThan(0);
    });
  });

  describe('시나리오 2: 기존 계정 - 기록 저장 → 공개 → 피드 노출', () => {
    it('2-1. 기록 저장 → 공개 설정 → 피드 조회', async () => {
      // 1. 기록 저장 (비공개)
      const createEmotionResult = await emotionsService.createEmotion({
        user_id: mockUserId,
        emotion_date: '2024-01-15',
        main_emotion: '기쁨',
        content: '오늘 기분이 좋아요',
        is_public: false,
      });
      expect(createEmotionResult.error).toBeNull();
      const emotionId = createEmotionResult.data!.id;

      // 2. 공개 설정으로 변경
      const updateEmotionResult = await emotionsService.updateEmotion(
        emotionId,
        { is_public: true },
        mockUserId
      );
      expect(updateEmotionResult.error).toBeNull();
      expect(updateEmotionResult.data?.is_public).toBe(true);

      // 3. 공개 기록 조회 (피드)
      const fetchPublicResult = await emotionsService.fetchEmotions({
        publicOnly: true,
      });
      expect(fetchPublicResult.error).toBeNull();
      expect(fetchPublicResult.data).toContainEqual(
        expect.objectContaining({
          id: emotionId,
          is_public: true,
        })
      );
    });
  });

  describe('시나리오 3: 권한 체크 - 게스트 vs 로그인 사용자', () => {
    it('3-1. 게스트는 쓰기 액션 불가', async () => {
      const guestContext = {
        userId: null,
        session: null,
        userProfile: null,
        isGuest: true,
      };

      // 가드 체크 (requireAuth)
      const { requireAuth } = await import('@lib/guards');
      const result = requireAuth(guestContext);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('AUTH_REQUIRED');
    });

    it('3-2. 로그인 사용자는 쓰기 액션 가능', async () => {
      const authContext = {
        userId: mockUserId,
        session: { user: { id: mockUserId } },
        userProfile: { onboarding_completed: true, is_deleted: false },
        isGuest: false,
      };

      const { requireAuth } = await import('@lib/guards');
      const result = requireAuth(authContext);
      expect(result.allowed).toBe(true);
    });
  });

  describe('시나리오 4: 이미지 업로드 - 프로필 이미지', () => {
    it('4-1. 프로필 이미지 업로드 → 설정 저장', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // 1. 이미지 업로드
      const uploadResult = await storageService.uploadFile({
        bucket: 'profile-images',
        userId: mockUserId,
        file: mockFile,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/'],
      });
      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data).toContain('profile-images');

      // 2. 설정 저장
      const updateSettingsResult = await settingsService.upsertUserSettings(mockUserId, {
        profile_url: uploadResult.data!,
      });
      expect(updateSettingsResult.error).toBeNull();
      expect(updateSettingsResult.data?.profile_url).toBe(uploadResult.data);
    });

    it('4-2. 파일 크기 초과 시 에러', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      const uploadResult = await storageService.uploadFile({
        bucket: 'profile-images',
        userId: mockUserId,
        file: largeFile,
        maxSize: 5 * 1024 * 1024,
      });
      expect(uploadResult.error).not.toBeNull();
      expect(uploadResult.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('시나리오 5: 중복 생성 방지 - 씨앗/설정', () => {
    it('5-1. 씨앗 중복 생성 방지', async () => {
      // 첫 번째 생성
      const firstResult = await flowersService.ensureFlowerRow(mockUserId);
      expect(firstResult.error).toBeNull();
      const firstFlowerId = firstResult.data!.id;

      // 두 번째 생성 시도 (기존 것 반환되어야 함)
      const secondResult = await flowersService.ensureFlowerRow(mockUserId);
      expect(secondResult.error).toBeNull();
      expect(secondResult.data?.id).toBe(firstFlowerId);
    });

    it('5-2. 설정 중복 생성 방지 (upsert)', async () => {
      // 첫 번째 생성
      const firstResult = await settingsService.upsertUserSettings(mockUserId, {
        seed_name: '첫 씨앗',
      });
      expect(firstResult.error).toBeNull();

      // 두 번째 업데이트 (upsert)
      const secondResult = await settingsService.upsertUserSettings(mockUserId, {
        seed_name: '두 번째 씨앗',
      });
      expect(secondResult.error).toBeNull();
      expect(secondResult.data?.seed_name).toBe('두 번째 씨앗');
    });
  });

  describe('시나리오 6: 에러 처리 - 네트워크/권한 에러', () => {
    it('6-1. 네트워크 에러 처리', async () => {
      // 네트워크 에러 시뮬레이션
      const networkError = new TypeError('Failed to fetch');
      const error = AppError.fromNetworkError(networkError, {
        userId: mockUserId,
        operation: 'test',
      });

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toContain('네트워크');
    });

    it('6-2. 권한 에러 처리', async () => {
      const permissionError = {
        code: '42501',
        message: 'permission denied',
        statusCode: 403,
      };
      const error = AppError.fromSupabaseError(permissionError, {
        userId: mockUserId,
        operation: 'test',
      });

      expect(error.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('시나리오 7: 온보딩 가드 - 완료/미완료', () => {
    it('7-1. 온보딩 완료 사용자는 홈 접근 가능', async () => {
      const context = {
        userId: mockUserId,
        session: { user: { id: mockUserId } },
        userProfile: { onboarding_completed: true, is_deleted: false },
        isGuest: false,
      };

      const { requireOnboardingComplete } = await import('@lib/guards');
      const result = requireOnboardingComplete(context);
      expect(result.allowed).toBe(true);
    });

    it('7-2. 온보딩 미완료 사용자는 온보딩으로 리다이렉트', async () => {
      const context = {
        userId: mockUserId,
        session: { user: { id: mockUserId } },
        userProfile: { onboarding_completed: false, is_deleted: false },
        isGuest: false,
      };

      const { requireOnboardingComplete } = await import('@lib/guards');
      const result = requireOnboardingComplete(context);
      expect(result.allowed).toBe(false);
      expect(result.redirectTo).toBe('/onboarding');
    });
  });

  describe('시나리오 8: 기록 수정/삭제 - 권한 체크', () => {
    it('8-1. 본인 기록 수정 가능', async () => {
      // 기록 생성
      const createResult = await emotionsService.createEmotion({
        user_id: mockUserId,
        emotion_date: '2024-01-15',
        main_emotion: '기쁨',
        content: '원본 내용',
      });
      const emotionId = createResult.data!.id;

      // 수정
      const updateResult = await emotionsService.updateEmotion(
        emotionId,
        { content: '수정된 내용' },
        mockUserId
      );
      expect(updateResult.error).toBeNull();
      expect(updateResult.data?.content).toBe('수정된 내용');
    });

    it('8-2. 본인 기록 삭제 가능', async () => {
      // 기록 생성
      const createResult = await emotionsService.createEmotion({
        user_id: mockUserId,
        emotion_date: '2024-01-15',
        main_emotion: '기쁨',
        content: '삭제할 내용',
      });
      const emotionId = createResult.data!.id;

      // 삭제
      const deleteResult = await emotionsService.deleteEmotion(emotionId, mockUserId);
      expect(deleteResult.error).toBeNull();

      // 삭제 확인
      const fetchResult = await emotionsService.fetchEmotionById(emotionId, mockUserId);
      expect(fetchResult.data).toBeNull();
    });
  });
});
