'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';
import ReactMarkdown from 'react-markdown';

export default function AdminAboutPage() {
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? '');
      const { data } = await supabase.from('about_me').select('content').eq('id', 1).single();
      setContent(data?.content ?? '');
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('about_me').update({ content, updated_at: new Date().toISOString() }).eq('id', 1);
    setSaving(false);
    if (error) {
      alert(`儲存失敗：${error.message}`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AdminShell pageTitle="關於我編輯" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>關於我內容</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setPreview(v => !v)}>{preview ? '✏️ 編輯' : '👁 預覽'}</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>{saving ? '儲存中...' : saved ? '✅ 已儲存' : '儲存'}</button>
        </div>
      </div>
      {preview ? (
        <div className={styles.markdownPreview} style={{ minHeight: 400 }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <div className={styles.formGroup}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ width: '100%', minHeight: 500, fontFamily: 'monospace', fontSize: 14, padding: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', resize: 'vertical' }}
            placeholder="請輸入關於我的 Markdown 內容..."
          />
        </div>
      )}
    </AdminShell>
  );
}
