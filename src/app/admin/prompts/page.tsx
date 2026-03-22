/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

interface Prompt {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  content: string;
  input_example: string;
  output_example: string;
  author: string;
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
  input_example: string;
  output_example: string;
  author: string;
  status: string;
}

const emptyForm: FormState = {
  title: '', description: '', category: '', difficulty: 'beginner',
  tagsRaw: '', content: '', input_example: '', output_example: '',
  author: 'admin', status: 'published',
};

const diffLabel: Record<string, string> = { beginner: '初級', intermediate: '中級', advanced: '進階' };
const badgeClass = (s: string) => s === 'published' ? styles.badgePublished : s === 'pending_review' ? styles.badgePending : s === 'rejected' ? styles.badgeRejected : styles.badgeDraft;
const badgeText = (s: string) => s === 'published' ? '已發布' : s === 'pending_review' ? '待審核' : s === 'rejected' ? '已拒絕' : '草稿';

export default function AdminPromptsPage() {
  const supabase = getSupabaseClient();
  const [items, setItems] = useState<Prompt[]>([]);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Combine DB categories + categories already in use from existing prompts
  const categories = useMemo(() => {
    const fromItems = items.map(i => i.category).filter(Boolean);
    return Array.from(new Set([...dbCategories, ...fromItems])).sort();
  }, [dbCategories, items]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'prompt').order('name');
    setDbCategories((data ?? []).map((c: { name: string }) => c.name));
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    const { data, error } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
    if (error) console.error('載入提示詞失敗:', error.message);
    setItems(data ?? []);
  };

  useEffect(() => { loadData(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const PAGE_SIZE = 21;
  const filtered = useMemo(() => {
    setPage(1);
    return filter === 'all' ? items : items.filter(i => i.status === filter);
  }, [items, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedFiltered = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item: Prompt) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      category: item.category,
      difficulty: item.difficulty,
      tagsRaw: (item.tags ?? []).join(', '),
      content: item.content ?? '',
      input_example: item.input_example ?? '',
      output_example: item.output_example ?? '',
      author: item.author ?? '',
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
      input_example: form.input_example,
      output_example: form.output_example,
      author: form.author,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    let saveError: string | null = null;
    if (editing) {
      const { error } = await supabase.from('prompts').update(payload).eq('id', editing.id);
      if (error) saveError = error.message;
    } else {
      const { data: inserted, error } = await supabase.from('prompts').insert(payload).select();
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

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('prompts').update({ status }).eq('id', id);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('prompts').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <AdminShell pageTitle="提示詞管理" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>提示詞列表</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAdd}>＋ 新增提示詞</button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', '全部'], ['pending_review', '待審核'], ['published', '已發布'], ['draft', '草稿'], ['rejected', '已拒絕']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`${styles.btn} ${filter === v ? styles.btnPrimary : styles.btnSecondary}`} style={{ padding: '6px 14px' }}>{l}</button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>標題</th><th>分類</th><th>難度</th><th>狀態</th><th>建立日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {pagedFiltered.length === 0
              ? <tr><td colSpan={6}><div className={styles.emptyState}><div className={styles.emptyIcon}>💬</div><p>無資料</p></div></td></tr>
              : pagedFiltered.map(item => (
                <tr key={item.id}>
                  <td className={styles.truncate}>{item.title}</td>
                  <td>{item.category}</td>
                  <td>{diffLabel[item.difficulty] ?? item.difficulty}</td>
                  <td><span className={`${styles.badge} ${badgeClass(item.status)}`}>{badgeText(item.status)}</span></td>
                  <td>{item.created_at?.slice(0, 10)}</td>
                  <td><div className={styles.actions}>
                    {item.status === 'pending_review' && <>
                      <button className={styles.approveBtn} onClick={() => updateStatus(item.id, 'published')}>批准</button>
                      <button className={styles.rejectBtn} onClick={() => updateStatus(item.id, 'rejected')}>拒絕</button>
                    </>}
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
              <h3>{editing ? '編輯提示詞' : '新增提示詞'}</h3>
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
                        list="prompt-categories"
                        value={form.category}
                        onChange={e => setField('category', e.target.value)}
                        placeholder="例：寫作、行銷、分析"
                      />
                      <datalist id="prompt-categories">
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
                    <label>提示詞內容</label>
                    <textarea value={form.content} onChange={e => setField('content', e.target.value)} style={{ minHeight: 160 }} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>輸入範例（選填）</label>
                    <textarea value={form.input_example} onChange={e => setField('input_example', e.target.value)} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>輸出範例（選填）</label>
                    <textarea value={form.output_example} onChange={e => setField('output_example', e.target.value)} />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>作者</label>
                      <input value={form.author} onChange={e => setField('author', e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>狀態</label>
                      <select value={form.status} onChange={e => setField('status', e.target.value)}>
                        <option value="published">已發布</option>
                        <option value="draft">草稿</option>
                        <option value="pending_review">待審核</option>
                        <option value="rejected">已拒絕</option>
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
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setDeleteTarget(null)}>取消</button>
              <button className={styles.btnDanger} onClick={handleDelete}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
