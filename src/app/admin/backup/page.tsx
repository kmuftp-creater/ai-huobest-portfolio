'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from '@/app/admin/admin.module.css';

const TABLES = [
  'projects',
  'prompts',
  'skills',
  'workshops',
  'shared_projects',
  'categories',
  'feedback',
  'about_me',
  'privacy_policy',
  'site_settings'
];

export default function AdminBackupPage() {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleEmailBackup = async () => {
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setEmailResult({ ok: false, msg: '請先登入後台再執行備份。' });
        return;
      }
      const res = await fetch('/api/backup/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailResult({ ok: true, msg: data.message });
      } else {
        setEmailResult({ ok: false, msg: data.error ?? '備份失敗，請確認 Vercel 環境變數是否設定完整。' });
      }
    } catch (e: unknown) {
      setEmailResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage('正在備份資料...');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backupData: Record<string, any[]> = {};
      
      for (const table of TABLES) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        backupData[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setMessage('備份完成！已下載 JSON 檔案。');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setMessage(`備份失敗：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('警告：還原操作將會嘗試覆寫現有與備份檔案中 ID 相同的資料。確定要繼續嗎？')) {
      return;
    }

    setLoading(true);
    setMessage('正在讀取備份檔案...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const backupData = JSON.parse(json);

        setMessage('開始還原資料...');
        let successCount = 0;

        for (const table of TABLES) {
          if (backupData[table] && backupData[table].length > 0) {
            const { error } = await supabase.from(table).upsert(backupData[table]);
            if (error) throw error;
            successCount++;
          }
        }

        setMessage(`還原成功！共更新了 ${successCount} 個資料表。`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err);
        setMessage(`還原失敗：${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setMessage('無法讀取檔案');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <AdminShell pageTitle="資料備份與還原">
      <div className={styles.pageHeader}>
        <h2>管理與備份所有資料表</h2>
      </div>

      <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>備份到信箱</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 8, fontSize: 14 }}>
          將所有資料表打包成 JSON 附件，立即寄送到設定的備份信箱。
        </p>
        <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 16, fontSize: 12 }}>
          🗓 自動排程：每週日早上 08:00 自動備份（由 cron-job.org 觸發）
        </p>
        <button
          className="btn btn-primary"
          onClick={handleEmailBackup}
          disabled={emailLoading}
        >
          {emailLoading ? '備份中…' : '📧 立即備份到信箱'}
        </button>
        {emailResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 14,
            background: emailResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: emailResult.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {emailResult.ok ? '✅ ' : '❌ '}{emailResult.msg}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>備份到本機 (下載)</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: 14 }}>
          一鍵匯出所有資料表為 JSON 檔案，下載到本機裝置保存。
        </p>
        <button
          className="btn btn-outline"
          onClick={handleExport}
          disabled={loading}
        >
          {loading && message.includes('備份') ? '處理中...' : '💾 下載備份檔 (.json)'}
        </button>
      </div>

      <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--color-border)' }}>
        <h3 style={{ marginBottom: 16 }}>還原 (匯入)</h3>
        <p style={{ color: 'var(--color-danger)', marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          注意：這會覆蓋有相同 ID 的資料。建議在還原前先手動刪除不需保留的舊資料，以免新舊資料交錯產生非預期的結果。
        </p>
        <div>
          <input 
            type="file" 
            accept=".json"
            id="backup-upload"
            onChange={handleImport}
            disabled={loading}
            style={{ display: 'none' }}
          />
          <label 
            htmlFor="backup-upload"
            className="btn btn-outline"
            style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading && message.includes('還原') ? '處理中...' : '選擇 JSON 備份檔上傳還原'}
          </label>
        </div>
      </div>

      {message && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 8, background: message.includes('失敗') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.includes('失敗') ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 500 }}>
          {message}
        </div>
      )}
    </AdminShell>
  );
}
