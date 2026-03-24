import type { EmotionCode } from '@domain/emotion';

export type FlowerType =
  | 'SUNFLOWER'
  | 'HYDRANGEA'
  | 'LAVENDER'
  | 'BLUE_ROSE'
  | 'RED_TULIP'
  | 'CACTUS'
  | 'CHERRY_BLOSSOM'
  | 'SPROUT'
  | 'MAGNOLIA'
  | 'WILD_FLOWER';

// 1. 감정 우선순위 배열 (동률 처리용)
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

// 2. 감정 → 꽃 타입 매핑
export const EMOTION_TO_FLOWER_TYPE: Record<EmotionCode, FlowerType> = {
  JOY: 'SUNFLOWER', // 햇살꽃
  CALM: 'HYDRANGEA', // 고요꽃
  ANXIOUS: 'LAVENDER', // 숨결꽃
  BLUE: 'BLUE_ROSE', // 새벽꽃
  ANGER: 'RED_TULIP', // 불꽃
  TIRED: 'CACTUS', // 버팀꽃
  EXCITED: 'CHERRY_BLOSSOM', // 두근꽃
  GROWTH: 'SPROUT', // 싹꽃
  PROUD: 'MAGNOLIA', // 빛꽃
  COMPLEX: 'WILD_FLOWER', // 얽힘꽃
};

// 3. 꽃 타입 → 꽃 이름(한국어) 매핑
export const FLOWER_TYPE_TO_NAME_KO: Record<FlowerType, string> = {
  SUNFLOWER: '햇살꽃',
  HYDRANGEA: '고요꽃',
  LAVENDER: '숨결꽃',
  BLUE_ROSE: '새벽꽃',
  RED_TULIP: '불꽃',
  CACTUS: '버팀꽃',
  CHERRY_BLOSSOM: '두근꽃',
  SPROUT: '싹꽃',
  MAGNOLIA: '빛꽃',
  WILD_FLOWER: '얽힘꽃',
};

// 4. 꽃 타입 → 개화 문구 매핑
export const FLOWER_TYPE_TO_BLOOM_CAPTION: Record<FlowerType, string> = {
  SUNFLOWER: '이 시기의 나는, 기쁨으로 가득했어요',
  HYDRANGEA: '이 시기의 나는, 차분히 나를 바라봤어요',
  LAVENDER: '이 시기의 나는, 불안했지만 잘 버텼어요',
  BLUE_ROSE: '이 시기의 나는, 조용히 슬픔을 품었어요',
  RED_TULIP: '이 시기의 나는, 뜨겁게 감정을 느꼈어요',
  CACTUS: '이 시기의 나는, 지쳐도 포기하지 않았어요',
  CHERRY_BLOSSOM: '이 시기의 나는, 설렘으로 하루를 보냈어요',
  SPROUT: '이 시기의 나는, 조금씩 자라고 있었어요',
  MAGNOLIA: '이 시기의 나는, 스스로가 자랑스러웠어요',
  WILD_FLOWER: '이 시기의 나는, 복잡한 감정 속에 있었어요',
};

// 5. 꽃 타입 → 임시 이미지 이모지 매핑
export const FLOWER_TYPE_TO_EMOJI: Record<FlowerType, string> = {
  SUNFLOWER: '🌻',
  HYDRANGEA: '💜',
  LAVENDER: '🪻',
  BLUE_ROSE: '🌀',
  RED_TULIP: '🌷',
  CACTUS: '🌵',
  CHERRY_BLOSSOM: '🌸',
  SPROUT: '🌱',
  MAGNOLIA: '🤍',
  WILD_FLOWER: '💐',
};

// 6. 꽃 타입 → 실제 앨범 이미지 경로 매핑 (public/assets/flowers)
export const FLOWER_TYPE_TO_IMAGE_SRC: Record<FlowerType, string> = {
  SUNFLOWER: '/assets/flowers/JOY.png',
  HYDRANGEA: '/assets/flowers/CALM.png',
  LAVENDER: '/assets/flowers/ANXIOUS.png',
  BLUE_ROSE: '/assets/flowers/BLUE.png',
  RED_TULIP: '/assets/flowers/ANGER.png',
  CACTUS: '/assets/flowers/TIRED.png',
  CHERRY_BLOSSOM: '/assets/flowers/EXCITED.png',
  SPROUT: '/assets/flowers/GROWTH.png',
  MAGNOLIA: '/assets/flowers/PROUD.png',
  WILD_FLOWER: '/assets/flowers/COMPLEX.png',
};

