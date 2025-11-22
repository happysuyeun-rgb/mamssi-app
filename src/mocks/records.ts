import type { EmotionRecord } from '../types/emotion';

// In-memory store (development only)
const emotionRecords: EmotionRecord[] = [];

export function getRecordsByDate(date: string): EmotionRecord[] {
  return emotionRecords.filter(r => r.date === date);
}

export function getLatestRecordByDate(date: string): EmotionRecord | null {
  const list = getRecordsByDate(date).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return list[0] || null;
}

export function getFirstRecordByDate(date: string): EmotionRecord | null {
  const list = getRecordsByDate(date).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  return list[0] || null;
}

export function createRecord(input: Omit<EmotionRecord, 'id' | 'createdAt' | 'updatedAt'>): EmotionRecord {
  const now = new Date().toISOString();
  const id = (globalThis as any)?.crypto?.randomUUID?.() ?? `rec-${emotionRecords.length + 1}-${Date.now()}`;
  const rec: EmotionRecord = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now
  };
  emotionRecords.push(rec);
  return rec;
}

export function getRecordById(id: string): EmotionRecord | null {
  const found = emotionRecords.find((rec) => rec.id === id);
  return found ? { ...found } : null;
}

export function updateRecord(
  id: string,
  updates: Partial<EmotionRecord>
): EmotionRecord | null {
  const idx = emotionRecords.findIndex((rec) => rec.id === id);
  if (idx === -1) return null;
  const next: EmotionRecord = {
    ...emotionRecords[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  emotionRecords[idx] = next;
  return { ...next };
}

export function deleteRecord(recordId: string): boolean {
  const idx = emotionRecords.findIndex((rec) => rec.id === recordId);
  if (idx === -1) return false;
  emotionRecords.splice(idx, 1);
  return true;
}

export function getAllRecords(): EmotionRecord[] {
  return [...emotionRecords];
}

// TODO: Replace with Supabase or real backend integration later.
export const __dev = { emotionRecords };


