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

  // Vercel에서 SUPABASE_* 또는 VITE_SUPABASE_* 둘 다 사용 가능 (Production 환경 적용 필수)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // service_role: RLS 우회, API 서버 전용 (절대 클라이언트에 노출 금지)
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseKey = serviceRoleKey || anonKey;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({
      error:
        'SUPABASE_URL, SUPABASE_ANON_KEY(또는 SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다. Vercel 환경변수에 추가하고 재배포하세요.',
    });
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
    const errMsg = String(insertError.message || '');
    const errCode = String((insertError as { code?: string }).code ?? '');
    console.error('[support-inquiry] DB insert error:', { code: errCode, message: errMsg, full: insertError });

    // 테이블 없음 → SQL 미실행 안내
    if (
      errCode === '42P01' ||
      errMsg.includes('does not exist') ||
      errMsg.includes('relation') ||
      errMsg.includes('존재하지 않')
    ) {
      res.status(500).json({
        error:
          'support_inquiries 테이블이 없습니다. Supabase 대시보드 → SQL Editor에서 supabase_support_inquiries.sql 파일 내용을 실행해주세요.',
      });
      return;
    }
    // RLS 등 권한 문제
    if (
      errCode === '42501' ||
      errMsg.includes('policy') ||
      errMsg.includes('permission') ||
      errMsg.includes('권한') ||
      errMsg.includes('row-level security') ||
      errMsg.includes('violates row-level security')
    ) {
      res.status(500).json({
        error:
          '문의 저장 권한이 없습니다. Supabase에서 support_inquiries 테이블 RLS 정책(insert all)을 확인해주세요.',
      });
      return;
    }
    // 그 외: 실제 Supabase 메시지를 포함해 원인 파악 가능하도록
    res.status(500).json({
      error: errMsg ? `문의 저장에 실패했습니다. (${errMsg})` : '문의 저장에 실패했습니다.',
    });
    return;
  }

  const createdAt = row?.created_at
    ? new Date(row.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  // 2. 이메일 발송 (앱 비밀번호 공백 제거, 587 포트로 시도 - Vercel에서 465가 막힌 경우 대비)
  const pass = String(gmailPass).replace(/\s/g, '');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: gmailUser.trim(),
      pass,
    },
    connectionTimeout: 10000,
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

  let emailSent = false;
  try {
    await transporter.sendMail(mailOptions);
    emailSent = true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errCode = err instanceof Error ? (err as { code?: string }).code : undefined;
    const response = err instanceof Error ? (err as { response?: string }).response : undefined;
    console.error('[support-inquiry] Email send error:', {
      message: errMsg,
      code: errCode,
      response,
      full: String(err),
    });
  }

  res.status(200).json({ success: true, id: row?.id, emailSent });
}
