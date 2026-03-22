'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

interface Settings {
  maintenance_mode: boolean;
  meta_keywords: string;
  meta_description: string;
  not_found_message: string;
  ga_code: string;
  fb_pixel: string;
  adsense_header: string;
  adsense_ads: string;
}

const defaultSettings: Settings = {
  maintenance_mode: false,
  meta_keywords: '',
  meta_description: '',
  not_found_message: '頁面不存在，請確認網址是否正確。',
  ga_code: '',
  fb_pixel: '',
  adsense_header: '',
  adsense_ads: '',
};

export default function AdminSettingsPage() {
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState('');
  const [form, setForm] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? '');
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (data) setForm({ maintenance_mode: data.maintenance_mode ?? false, meta_keywords: data.meta_keywords ?? '', meta_description: data.meta_description ?? '', not_found_message: data.not_found_message ?? '', ga_code: data.ga_code ?? '', fb_pixel: data.fb_pixel ?? '', adsense_header: data.adsense_header ?? '', adsense_ads: data.adsense_ads ?? '' });
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('site_settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setField = (k: keyof Settings, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AdminShell pageTitle="網站設定" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>網站設定</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>{saving ? '儲存中...' : saved ? '✅ 已儲存' : '儲存所有設定'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* General */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
          <p className={styles.sectionTitle}>一般設定</p>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              <strong>維護模式</strong>
              <small>啟用後網站會顯示維護中訊息</small>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={form.maintenance_mode} onChange={e => setField('maintenance_mode', e.target.checked)} />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <div className={styles.formGroup} style={{ marginTop: 16 }}>
            <label>404 自訂訊息</label>
            <input value={form.not_found_message} onChange={e => setField('not_found_message', e.target.value)} />
          </div>
        </div>

        {/* SEO */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
          <p className={styles.sectionTitle}>SEO 設定</p>
          <div className={styles.form}>
            <div className={styles.formGroup}><label>Meta 描述</label><textarea value={form.meta_description} onChange={e => setField('meta_description', e.target.value)} style={{ minHeight: 80 }} /></div>
            <div className={styles.formGroup}><label>Meta 關鍵字</label><input value={form.meta_keywords} onChange={e => setField('meta_keywords', e.target.value)} placeholder="AI, 提示詞, Portfolio…" /></div>
          </div>
        </div>

        {/* Analytics */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
          <p className={styles.sectionTitle}>追蹤碼設定</p>
          <div className={styles.form}>
            <div className={styles.formGroup}><label>Google Analytics 追蹤 ID（GA4）</label><input value={form.ga_code} onChange={e => setField('ga_code', e.target.value)} placeholder="G-XXXXXXXXXX" /></div>
            <div className={styles.formGroup}><label>Facebook Pixel ID</label><input value={form.fb_pixel} onChange={e => setField('fb_pixel', e.target.value)} placeholder="123456789" /></div>
          </div>
        </div>

        {/* AdSense */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
          <p className={styles.sectionTitle}>Google AdSense</p>
          <div className={styles.form}>
            <div className={styles.formGroup}><label>AdSense Header Code</label><textarea value={form.adsense_header} onChange={e => setField('adsense_header', e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="<script async src=...>" /></div>
            <div className={styles.formGroup}><label>AdSense Ads Code</label><textarea value={form.adsense_ads} onChange={e => setField('adsense_ads', e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="<ins class=adsbygoogle...>" /></div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
