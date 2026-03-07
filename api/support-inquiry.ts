import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const TO_EMAIL = 'mamssi.official@gmail.com';

type SupportPayload = {
  email: string;
  category: string;
  title: string;
  content: string;
  user_id?: string;
};

function validatePayload(body: unknown): body is SupportPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.email === 'string' &&
    b.email.trim().length > 0 &&
    typeof b.category === 'string' &&
    typeof b.title === 'string' &&
    typeof b.content === 'string'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!validatePayload(req.body)) {
    res.status(400).json({ error: '필수 필드: email, category, title, content' });
    return;
  }

  const { email, category, title, content, user_id } = req.body;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'SUPABASE_URL, SUPABASE_ANON_KEY가 설정되지 않았습니다.' });
    return;
  }

  if (!gmailUser || !gmailPass) {
    res.status(500).json({ error: 'GMAIL_USER, GMAIL_PASS가 설정되지 않았습니다.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. DB에 문의 저장
  const { data: row, error: insertError } = await supabase
    .from('support_inquiries')
    .insert({
      user_id: user_id || null,
      email: email.trim(),
      category: category.trim() || '일반',
      title: title.trim() || '(제목 없음)',
      content: content.trim(),
      status: 'pending',
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    console.error('[support-inquiry] DB insert error:', insertError);
    res.status(500).json({ error: '문의 저장에 실패했습니다.' });
    return;
  }

  const createdAt = row?.created_at
    ? new Date(row.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  // 2. 이메일 발송
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions = {
    from: `"마음씨 문의" <${gmailUser}>`,
    to: TO_EMAIL,
    subject: '[마음씨 고객문의]',
    text: `문의 유형:\n${category.trim() || '일반'}

제목:\n${title.trim() || '(제목 없음)'}

내용:\n${content.trim()}

사용자 이메일:\n${email.trim()}

문의시간:\n${createdAt}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[support-inquiry] Email send error:', err);
    // DB는 이미 저장됐으므로 200 반환, 클라이언트에는 성공으로 전달
    // 필요 시 에러 반환: res.status(500).json({ error: '이메일 발송에 실패했습니다.' });
  }

  res.status(200).json({ success: true, id: row?.id });
}
