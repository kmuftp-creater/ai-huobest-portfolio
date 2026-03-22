/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/app/admin/admin.module.css';

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  content: string;
  source: string;
  how_to_use: string;
  status: string;
  created_at: string;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tagsRaw: string;
  content: string;
  source: string;
  how_to_use: string;
  status: string;
}

const emptyForm: FormState = {
  title: '', description: '', category: '', difficulty: 'beginner',
  tagsRaw: '', content: '', source: '', how_to_use: '', status: 'published',
};

export default function AdminSkillsPage() {
  const supabase = getSupabaseClient();
  const [items, setItems] = useState<Skill[]>([]);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [page, setPage] = useState(1);
  const [howToUsePreview, setHowToUsePreview] = useState(false);

  const [dbCategories, setDbCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const fromItems = items.map(i => i.category).filter(Boolean);
    return Array.from(new Set([...dbCategories, ...fromItems])).sort();
  }, [dbCategories, items]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'skill').order('name');
    setDbCategories((data ?? []).map((c: { name: string }) => c.name));
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    const { data } = await supabase.from('skills').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { loadData(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: Skill) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      category: item.category ?? '',
      difficulty: item.difficulty,
      tagsRaw: (item.tags ?? []).join(', '),
      content: item.content ?? '',
      source: item.source ?? '',
      how_to_use: item.how_to_use ?? '',
      status: item.status,
    });
    setShowModal(true);
  };

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSaving(true);
    const tags = form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      difficulty: form.difficulty,
      tags,
      content: form.content,
      source: form.source,
      how_to_use: form.how_to_use,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    let saveError: string | null = null;
    if (editing) {
      const { error } = await supabase.from('skills').update(payload).eq('id', editing.id);
      if (error) saveError = error.message;
    } else {
      const { data: inserted, error } = await supabase.from('skills').insert(payload).select();
      if (error) saveError = error.message;
      else if (!inserted || inserted.length === 0) saveError = '資料未寫入，請確認 Supabase RLS 原則設定';
    }
    setSaving(false);
    if (saveError) {
      alert(`儲存失敗：${saveError}`);
      return;
    }
    setShowModal(false);
    await loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('skills').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const PAGE_SIZE = 21;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminShell pageTitle="Skill 管理" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>Skill 列表</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAdd}>＋ 新增 Skill</button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>標題</th><th>分類</th><th>難度</th><th>狀態</th><th>建立日期</th><th>操作</th></tr></thead>
          <tbody>
            {pagedItems.length === 0
              ? <tr><td colSpan={6}><div className={styles.emptyState}><div className={styles.emptyIcon}>🧠</div><p>尚無 Skill 資料</p></div></td></tr>
              : pagedItems.map(item => (
                <tr key={item.id}>
                  <td className={styles.truncate}>{item.title}</td>
                  <td>{item.category}</td>
                  <td>{item.difficulty === 'beginner' ? '初級' : item.difficulty === 'intermediate' ? '中級' : '進階'}</td>
                  <td><span className={`${styles.badge} ${item.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>{item.status === 'published' ? '已發布' : '草稿'}</span></td>
                  <td>{item.created_at?.slice(0, 10)}</td>
                  <td><div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(item)}>編輯</button>
                    <button className={styles.deleteBtn} onClick={() => setDeleteTarget(item)}>刪除</button>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, padding: '12px 0' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ opacity: page === 1 ? 0.4 : 1 }}>← 上一頁</button>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{page} / {totalPages}</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ opacity: page === totalPages ? 0.4 : 1 }}>下一頁 →</button>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.modalLarge}`}>
            <div className={styles.modalHeader}>
              <h3>{editing ? '編輯 Skill' : '新增 Skill'}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>標題 *</label>
                    <input value={form.title} onChange={e => setField('title', e.target.value)} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>描述</label>
                    <textarea value={form.description} onChange={e => setField('description', e.target.value)} />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>分類（可直接輸入或從清單選擇）</label>
                      <input
                        list="skill-categories"
                        value={form.category}
                        onChange={e => setField('category', e.target.value)}
                        placeholder="例：寫作、行銷、分析"
                      />
                      <datalist id="skill-categories">
                        {categories.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div className={styles.formGroup}>
                      <label>難度</label>
                      <select value={form.difficulty} onChange={e => setField('difficulty', e.target.value)}>
                        <option value="beginner">初級</option>
                        <option value="intermediate">中級</option>
                        <option value="advanced">進階</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>標籤（逗號分隔）</label>
                    <input
                      value={form.tagsRaw}
                      onChange={e => setField('tagsRaw', e.target.value)}
                      placeholder="例：寫作, 行銷, 創作"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Skill 指令內容（Markdown）</label>
                    <textarea
                      value={form.content}
                      onChange={e => setField('content', e.target.value)}
                      style={{ minHeight: 160, fontFamily: 'monospace' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label>說明（支援 Markdown）</label>
                      <button type="button" onClick={() => setHowToUsePreview(v => !v)} style={{ fontSize: 12, padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                        {howToUsePreview ? '✏️ 編輯' : '👁 預覽'}
                      </button>
                    </div>
                    {howToUsePreview ? (
                      <div style={{ minHeight: 200, padding: '12px 16px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.how_to_use || '*（無內容）*'}</ReactMarkdown>
                      </div>
                    ) : (
                      <textarea value={form.how_to_use} onChange={e => setField('how_to_use', e.target.value)} style={{ minHeight: 200, fontFamily: 'monospace' }} placeholder="支援 Markdown 語法，例如：&#10;## 使用步驟&#10;1. 步驟一&#10;2. 步驟二" />
                    )}
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>來源（網址或說明）</label>
                      <input value={form.source} onChange={e => setField('source', e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>狀態</label>
                      <select value={form.status} onChange={e => setField('status', e.target.value)}>
                        <option value="published">已發布</option>
                        <option value="draft">草稿</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}><h3>確認刪除</h3><button className={styles.modalClose} onClick={() => setDeleteTarget(null)}>✕</button></div>
            <div className={styles.modalBody}><p className={styles.confirmText}>確定要刪除「{deleteTarget.title}」嗎？</p><p className={styles.confirmSub}>此操作無法復原。</p></div>
            <div className={styles.modalFooter}><button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setDeleteTarget(null)}>取消</button><button className={styles.btnDanger} onClick={handleDelete}>確認刪除</button></div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
