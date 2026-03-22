/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

interface Feedback {
  id: string;
  type: string;
  title: string;
  detail: string;
  email: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const supabase = getSupabaseClient();
  const [items, setItems] = useState<Feedback[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [statusInput, setStatusInput] = useState('pending');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? '');
    
    // 預設抓取 status 若不存在也不會出錯，只要建完新欄位就能讀到
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
      
    // 防止尚未 migrate 時，舊資料沒有 status 欄位導致 undefined
    const validData = (data ?? []).map(item => ({
      ...item,
      status: item.status || 'pending',
      admin_note: item.admin_note || ''
    }));
    
    setItems(validData);
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (item: Feedback) => {
    setEditing(item);
    setStatusInput(item.status);
    setAdminNoteInput(item.admin_note || '');
    setShowEditModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('feedback')
      .update({
        status: statusInput,
        admin_note: adminNoteInput,
      })
      .eq('id', editing.id);

    setSaving(false);

    if (error) {
      alert(`儲存失敗：${error.message}`);
      return;
    }
    
    setShowEditModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('feedback').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feature': return '功能建議';
      case 'bug': return '錯誤回報';
      case 'usage': return '使用問題';
      case 'course': return '課程邀約';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved': return '已處理';
      case 'unresolvable': return '無法解決';
      case 'pending':
      default: return '待處理';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'resolved': return styles.badgePublished; // Green 樣式
      case 'unresolvable': return styles.badgeDraft; // Gray 樣式，這裡可借用
      case 'pending':
      default: return styles.badgeDraft; // 預設草稿/待處理樣式
    }
  };

  return (
    <AdminShell pageTitle="回報問題管理" userEmail={userEmail}>
      <div className={styles.pageHeader}>
        <h2>回饋列表</h2>
        <p style={{ color: 'var(--text-secondary)' }}>在此查看並管理使用者填寫的問題與建議</p>
      </div>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>類型</th>
              <th>標題</th>
              <th>聯絡信箱</th>
              <th>狀態</th>
              <th>建立日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📩</div>
                    <p>尚無回報紀錄</p>
                  </div>
                </td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>{getTypeLabel(item.type)}</td>
                <td className={styles.truncate} title={item.title}>{item.title}</td>
                <td>{item.email || '-'}</td>
                <td>
                  <span className={`${styles.badge} ${getStatusBadgeStyle(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>{item.created_at?.slice(0, 10)}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(item)}>處理</button>
                    <button className={styles.deleteBtn} onClick={() => setDeleteTarget(item)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && editing && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.modalLarge}`}>
            <div className={styles.modalHeader}>
              <h3>處理回饋項目</h3>
              <button className={styles.modalClose} onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  
                  {/* Read Only Details */}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>類型</label>
                      <input value={getTypeLabel(editing.type)} disabled className="input-disabled" style={{ opacity: 0.7 }} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>聯絡信箱</label>
                      <input value={editing.email || '未填寫'} disabled style={{ opacity: 0.7 }} />
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>標題</label>
                    <input value={editing.title} disabled style={{ opacity: 0.7, width: '100%' }} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>詳細內容</label>
                    <textarea 
                      value={editing.detail} 
                      disabled 
                      style={{ minHeight: '120px', opacity: 0.7, width: '100%' }} 
                    />
                  </div>
                  
                  <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                  
                  {/* Editable Fields */}
                  <div className={styles.formGroup}>
                    <label>處理進度</label>
                    <select 
                      value={statusInput} 
                      onChange={(e) => setStatusInput(e.target.value)}
                    >
                      <option value="pending">待處理</option>
                      <option value="resolved">已處理</option>
                      <option value="unresolvable">無法解決</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>管理員備註（僅後台可見）</label>
                    <textarea 
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="簡短紀錄處理狀況..."
                      style={{ minHeight: '100px', width: '100%' }}
                    />
                  </div>

                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowEditModal(false)}>
                  取消
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
                  {saving ? '儲存中...' : '儲存狀態與備註'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>確認刪除</h3>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>確定要刪除「{deleteTarget.title}」這筆回報嗎？</p>
              <p className={styles.confirmSub}>此操作無法復原。</p>
            </div>
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
