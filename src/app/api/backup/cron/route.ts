import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const TABLES = [
  'projects', 'prompts', 'skills', 'workshops',
  'shared_projects', 'categories', 'feedback',
  'about_me', 'privacy_policy', 'site_settings',
];

export async function GET(request: Request) {
  // 1. 安全驗證：確保是 Vercel Cron Job 或授權的人呼叫
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. 初始化 Supabase（使用 Service Role Key 才能讀取所有資料）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 3. 抓取所有資料表內容
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

    // 4. 轉成 JSON 字串準備作為附件
    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);

    // 5. 使用 Gmail 發送 Email（nodemailer）
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Google 應用程式密碼（16碼）
      },
    });

    await transporter.sendMail({
      from: `"備份機器人" <${process.env.GMAIL_USER}>`,
      to: process.env.BACKUP_EMAIL_TO,
      subject: `[專案備份] 霍 の AI 腦洞實驗室 - ${dateStr}`,
      text: `附件為 ${dateStr} 的系統資料庫完整備份檔，請妥善保存。`,
      attachments: [
        {
          filename: `backup_${dateStr}.json`,
          content: Buffer.from(jsonString, 'utf-8'),
          contentType: 'application/json',
        },
      ],
    });

    return NextResponse.json({ success: true, message: `備份已發送至 ${process.env.BACKUP_EMAIL_TO}` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Backup Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
