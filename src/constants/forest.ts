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

