import type { ForestCategory } from '@domain/forest';

export const FOREST_CATEGORIES: ForestCategory[] = [
  'BEST',
  '일상',
  '고민',
  '연애',
  '회사',
  '유머',
  '성장',
  '자기돌봄'
];

export const RECORD_CATEGORY_TO_FOREST: Record<string, ForestCategory> = {
  daily: '일상',
  worry: '고민',
  love: '연애',
  work: '회사',
  humor: '유머',
  growth: '성장',
  selfcare: '자기돌봄'
};

// 한글 카테고리 → 영문키 매핑 (DB 저장용)
export const FOREST_CATEGORY_TO_RECORD: Record<ForestCategory, string> = {
  'BEST': 'daily', // BEST는 매핑되지 않으므로 기본값
  '일상': 'daily',
  '고민': 'worry',
  '연애': 'love',
  '회사': 'work',
  '유머': 'humor',
  '성장': 'growth',
  '자기돌봄': 'selfcare'
};

