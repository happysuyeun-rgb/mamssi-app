/**
 * 잠금 설정 값(패턴/PIN)을 해시 처리
 * @param value 패턴 배열 또는 PIN 문자열
 * @returns 해시된 문자열
 */
export async function hashLockValue(value: number[] | string): Promise<string> {
  const str = Array.isArray(value) ? value.join(',') : value;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 잠금 값 검증 (해시 비교)
 * @param input 입력된 값
 * @param storedHash 저장된 해시
 * @returns 일치 여부
 */
export async function verifyLockValue(input: number[] | string, storedHash: string): Promise<boolean> {
  const inputHash = await hashLockValue(input);
  return inputHash === storedHash;
}











