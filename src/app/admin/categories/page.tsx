/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

// ─────────────────────────────────────────────
// 分類管理頁面
// 從各資料表動態讀取現有分類，並允許直接
// 在此頁面新增 / 刪除分類字串。
// 分類儲存在獨立的 `categories` 資料表中。
// 若尚未建立該資料表，請執行以下 SQL：
//
//   create table categories (
//     id uuid primary key default gen_random_uuid(),
//     name text not null,
//     type text not null, -- 'skill' | 'prompt' | 'project' | 'sharing'
//     created_at timestamptz default now()
//   );
//   alter table categories enable row level security;
//   create policy "Admin manage categories" on categories
//     using (auth.role() = 'authenticated');
// ─────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  skill: 'Skill 分享',
  prompt: '提示詞分享',
  project: '作品介紹',
};

const TYPES = Object.keys(TYPE_LABELS);

export default function AdminCategoriesPage() {
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('skill');
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState('skill');
  const [dbError, setDbError] = useState(false);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('type')
      .order('name');
    if (error) {
      setDbError(true);
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    await supabase.from('categories').insert({ name: newName.trim(), type: newType });
    setNewName('');
    setSaving(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此分類嗎？')) return;
    await supabase.from('categories').delete().eq('id', id);
    loadData();
  };

  const filtered = categories.filter(c => c.type === activeType);

  return (
    <AdminShell pageTitle="分類管理" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>分類管理</h2>
      </div>

      {dbError && (
        <div style={{ background: 'var(--color-danger)', color: '#fff', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
          <strong>尚未建立 categories 資料表！</strong>請至 Supabase SQL Editor 執行以下指令後重整頁面：
          <pre style={{ marginTop: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: 12, overflowX: 'auto', fontSize: 12 }}>{`create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  created_at timestamptz default now()
);
alter table categories enable row level security;
create policy "Allow authenticated" on categories
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');`}</pre>
        </div>
      )}

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TYPES.map(type => (
          <button
            key={type}
            className={`${styles.btn} ${activeType === type ? styles.btnPrimary : styles.btnSecondary}`}
            style={{ padding: '6px 16px' }}
            onClick={() => setActiveType(type)}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Add new category */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={newType}
          onChange={e => { setNewType(e.target.value); setActiveType(e.target.value); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', minWidth: 140 }}
        >
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="新分類名稱"
          required
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        />
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={saving || dbError}
        >
          {saving ? '新增中...' : '＋ 新增'}
        </button>
      </form>

      {/* Category list */}
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>載入中...</p>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏷️</div>
          <p>尚無「{TYPE_LABELS[activeType]}」分類，請在上方新增</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr><th>分類名稱</th><th>類型</th><th>建立日期</th><th>操作</th></tr>
            </thead>
            <tbody>
              {filtered.map(cat => (
                <tr key={cat.id}>
                  <td><strong>{cat.name}</strong></td>
                  <td><span className={`${styles.badge} ${styles.badgePublished}`}>{TYPE_LABELS[cat.type] ?? cat.type}</span></td>
                  <td>{cat.created_at?.slice(0, 10)}</td>
                  <td>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(cat.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
