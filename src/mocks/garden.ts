import type { GardenStatus } from '@domain/emotion';

// TODO: Replace with real DB fetch (e.g., Supabase) using userId
export function getGardenStatus(_userId: string): GardenStatus {
  return {
    totalDays: 100,
    recordedDays: 28,
    progressPercent: 28
  };
}


