/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import ImageUploader from '@/components/admin/ImageUploader';
import styles from '@/app/admin/admin.module.css';

interface SharedProject {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  link_url: string;
  content: string;
  html_code: string;
  embed_type: string; // 'link' | 'html'
  status: string;
  created_at: string;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  image_url: string;
  link_url: string;
  content: string;
  html_code: string;
  embed_type: string;
  status: string;
}

const emptyForm: FormState = {
  title: '', description: '', category: '', image_url: '', link_url: '',
  content: '', html_code: '', embed_type: 'link', status: 'published',
};

export default function AdminSharingPage() {
  const supabase = getSupabaseClient();
  const [items, setItems] = useState<SharedProject[]>([]);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SharedProject | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SharedProject | null>(null);

  const [categories, setCategories] = useState<string[]>([]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'sharing').order('name');
    setCategories((data ?? []).map(c => c.name));
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    const { data } = await supabase.from('shared_projects').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { loadData(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item: SharedProject) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      category: item.category ?? '',
      image_url: item.image_url ?? '',
      link_url: item.link_url ?? '',
      content: item.content ?? '',
      html_code: item.html_code ?? '',
      embed_type: item.embed_type ?? 'link',
      status: item.status,
    });
    setShowModal(true);
  };

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editing) {
      await supabase.from('shared_projects').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('shared_projects').insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('shared_projects').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <AdminShell pageTitle="作品分享管理" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>作品分享列表</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAdd}>＋ 新增作品</button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>標題</th><th>分類</th><th>類型</th><th>連結</th><th>狀態</th><th>建立日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={7}><div className={styles.emptyState}><div className={styles.emptyIcon}>🔗</div><p>尚無作品資料</p></div></td></tr>
              : items.map(item => (
                <tr key={item.id}>
                  <td className={styles.truncate}>{item.title}</td>
                  <td>{item.category}</td>
                  <td>
                    <span className={`${styles.badge} ${item.embed_type === 'html' ? styles.badgePending : styles.badgePublished}`}>
                      {item.embed_type === 'html' ? '內嵌 HTML' : '外部連結'}
                    </span>
                  </td>
                  <td className={styles.truncate}>
                    {item.embed_type === 'html'
                      ? <a href={`/app/${item.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>預覽應用</a>
                      : <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{item.link_url}</a>
                    }
                  </td>
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

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 760 }}>
            <div className={styles.modalHeader}>
              <h3>{editing ? '編輯作品' : '新增作品'}</h3>
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
                  <div className={styles.formGroup}>
                    <label>分類</label>
                    <select
                      value={form.category}
                      onChange={e => setField('category', e.target.value)}
                    >
                      <option value="">-- 選擇分類 --</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>作品類型</label>
                    <select value={form.embed_type} onChange={e => setField('embed_type', e.target.value)}>
                      <option value="link">外部連結（跳轉到外部網址）</option>
                      <option value="html">內嵌 HTML（貼上 HTML 程式碼，直接在本站顯示）</option>
                    </select>
                  </div>
                  {form.embed_type === 'link' ? (
                    <div className={styles.formGroup}>
                      <label>連結 URL</label>
                      <input value={form.link_url} onChange={e => setField('link_url', e.target.value)} placeholder="https://..." />
                    </div>
                  ) : (
                    <div className={styles.formGroup}>
                      <label>HTML 程式碼（完整的 HTML 文件或片段）</label>
                      <textarea
                        value={form.html_code}
                        onChange={e => setField('html_code', e.target.value)}
                        style={{ minHeight: 240, fontFamily: 'monospace', fontSize: 13 }}
                        placeholder={'<!DOCTYPE html>\n<html>\n<head><title>我的應用</title></head>\n<body>\n  <!-- 貼上你的 HTML/CSS/JS 程式碼 -->\n</body>\n</html>'}
                      />
                      <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        💡 支援 HTML + CSS + JavaScript。純 React 專案請先 build 為靜態 HTML 後再貼入。
                      </p>
                    </div>
                  )}
                  <div className={styles.formGroup}>
                    <label>封面圖片</label>
                    <ImageUploader
                      bucket="assets"
                      folder="sharing"
                      onUploadSuccess={(url) => setField('image_url', url)}
                      currentImageUrl={form.image_url}
                    />
                    <input
                      value={form.image_url}
                      onChange={e => setField('image_url', e.target.value)}
                      placeholder="或直接輸入圖片網址"
                      style={{ marginTop: 8 }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>說明內容</label>
                    <textarea value={form.content} onChange={e => setField('content', e.target.value)} />
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
