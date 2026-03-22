import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const TABLES = [
  'projects', 'prompts', 'skills', 'workshops',
  'shared_projects', 'categories', 'feedback',
  'about_me', 'privacy_policy', 'site_settings',
];

export async function POST(request: Request) {
  try {
    // 1. 驗證管理員身份（用 anon key 確認登入的用戶是管理員）
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '驗證失敗' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    // 2. 使用 Service Role Key 讀取所有資料
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const backupData: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`Table ${table} skipped:`, error.message);
        backupData[table] = [];
      } else {
        backupData[table] = data ?? [];
      }
    }

    // 3. 轉成 JSON 附件並發信
    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"備份機器人" <${process.env.GMAIL_USER}>`,
      to: process.env.BACKUP_EMAIL_TO,
      subject: `[手動備份] 霍 の AI 腦洞實驗室 - ${dateStr}`,
      text: `這是由管理員於 ${dateStr} 手動觸發的資料庫備份，附件為完整 JSON 備份檔。`,
      attachments: [
        {
          filename: `backup_manual_${dateStr.replace(' ', '_').replace(':', '')}.json`,
          content: Buffer.from(jsonString, 'utf-8'),
          contentType: 'application/json',
        },
      ],
    });

    return NextResponse.json({ success: true, message: `備份已發送至 ${process.env.BACKUP_EMAIL_TO}` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Manual Backup Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
