import type { EmotionCode } from '@domain/emotion';

export type EmotionOption = {
  code: EmotionCode;
  label: string;
  emoji: string;
};

export const EMOTION_OPTIONS: EmotionOption[] = [
  { code: 'JOY', label: '기쁨', emoji: '😆' },
  { code: 'CALM', label: '차분', emoji: '🙂' },
  { code: 'ANXIOUS', label: '불안', emoji: '😰' },
  { code: 'BLUE', label: '우울', emoji: '😔' },
  { code: 'ANGER', label: '화남', emoji: '😡' },
  { code: 'TIRED', label: '지침', emoji: '😪' },
  { code: 'EXCITED', label: '설렘', emoji: '🤩' },
  { code: 'GROWTH', label: '성장', emoji: '🌱' },
  { code: 'PROUD', label: '뿌듯', emoji: '🥰' },
  { code: 'COMPLEX', label: '복잡', emoji: '🌀' }
];

export const EMOTION_OPTION_MAP: Record<EmotionCode, EmotionOption> = EMOTION_OPTIONS.reduce(
  (acc, option) => {
    acc[option.code] = option;
    return acc;
  },
  {} as Record<EmotionCode, EmotionOption>
);

export function findEmotionOption(code: EmotionCode | string) {
  return EMOTION_OPTIONS.find((opt) => opt.code === code) ?? null;
}


