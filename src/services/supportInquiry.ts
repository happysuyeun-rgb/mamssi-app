/**
 * 고객 문의 제출 서비스
 * - API 호출로 DB 저장 + 이메일 발송
 */

export type SupportInquiryPayload = {
  email: string;
  category: string;
  title: string;
  content: string;
};

export type SubmitInquiryResult =
  | { success: true; id?: string }
  | { success: false; error: string };

const getApiBase = (): string => {
  const base = import.meta.env.VITE_API_URL;
  if (base && typeof base === 'string' && base.trim()) {
    return base.replace(/\/$/, '');
  }
  return ''; // same origin
};

export async function submitInquiry(
  payload: SupportInquiryPayload,
  userId?: string | null
): Promise<SubmitInquiryResult> {
  const { email, category, title, content } = payload;

  if (!email?.trim()) {
    return { success: false, error: '이메일을 입력해주세요.' };
  }
  if (!content?.trim()) {
    return { success: false, error: '문의 내용을 입력해주세요.' };
  }

  const base = getApiBase();
  const url = base ? `${base}/api/support-inquiry` : '/api/support-inquiry';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        category: (category || '일반').trim(),
        title: (title || '').trim(),
        content: content.trim(),
        user_id: userId || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        (data?.error as string) || `요청 실패 (${res.status})`;
      return { success: false, error: message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : '네트워크 오류';
    return { success: false, error: message };
  }
}
