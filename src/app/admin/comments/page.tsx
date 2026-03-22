'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

interface Comment {
  id: string;
  content_type: string;
  content_id: string;
  user_name: string;
  user_email: string;
  body: string;
  status: string;
  created_at: string;
}

export default function AdminCommentsPage() {
  const supabase = getSupabaseClient();
  const [userEmail, setUserEmail] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [moderation, setModeration] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [savingModeration, setSavingModeration] = useState(false);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? '');

    const { data: commentData } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });
    setComments(commentData ?? []);

    const { data: settings } = await supabase
      .from('site_settings')
      .select('comment_moderation')
      .eq('id', 1)
      .single();
    setModeration(settings?.comment_moderation ?? false);
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id: string) => {
    await supabase.from('comments').update({ status: 'approved' }).eq('id', id);
    loadData();
  };

  const handleReject = async (id: string) => {
    await supabase.from('comments').update({ status: 'rejected' }).eq('id', id);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('comments').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const handleModerationToggle = async () => {
    setSavingModeration(true);
    await supabase
      .from('site_settings')
      .update({ comment_moderation: !moderation, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setModeration(m => !m);
    setSavingModeration(false);
  };

  const contentTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return '作品介紹';
      case 'prompt': return '提示詞';
      case 'skill': return 'Skill';
      default: return type;
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'approved': return '已發布';
      case 'pending': return '待審核';
      case 'rejected': return '已拒絕';
      default: return s;
    }
  };

  const statusBadgeStyle = (s: string) => {
    switch (s) {
      case 'approved': return styles.badgePublished;
      case 'pending': return styles.badgePending;
      case 'rejected': return styles.badgeRejected;
      default: return styles.badgeDraft;
    }
  };

  const filtered = filterStatus === 'all'
    ? comments
    : comments.filter(c => c.status === filterStatus);

  const countByStatus = (s: string) => comments.filter(c => c.status === s).length;

  return (
    <AdminShell pageTitle="留言管理" userEmail={userEmail}>
      <div className={styles.pageHeader}>
        <h2>留言管理</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>留言審核模式</span>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={moderation}
              onChange={handleModerationToggle}
              disabled={savingModeration}
            />
            <span className={styles.toggleSlider}></span>
          </label>
          <span style={{ fontSize: 13, color: moderation ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            {moderation ? '開啟（需審核才發布）' : '關閉（自由發布）'}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            className={filterStatus === s ? `${styles.btn} ${styles.btnPrimary}` : `${styles.btn} ${styles.btnSecondary}`}
            style={{ padding: '5px 16px', fontSize: 13 }}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? `全部 (${comments.length})` : `${statusLabel(s)} (${countByStatus(s)})`}
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>類型</th>
              <th>評論者</th>
              <th>留言內容</th>
              <th>狀態</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>💬</div>
                    <p>尚無留言紀錄</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(comment => (
              <tr key={comment.id}>
                <td>
                  <span className={`${styles.badge} ${styles.badgeDraft}`}>
                    {contentTypeLabel(comment.content_type)}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{comment.user_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{comment.user_email}</div>
                </td>
                <td style={{ maxWidth: 260 }}>
                  <div className={styles.truncate} title={comment.body}>{comment.body}</div>
                </td>
                <td>
                  <span className={`${styles.badge} ${statusBadgeStyle(comment.status)}`}>
                    {statusLabel(comment.status)}
                  </span>
                </td>
                <td>{comment.created_at?.slice(0, 10)}</td>
                <td>
                  <div className={styles.actions}>
                    {comment.status !== 'approved' && (
                      <button className={styles.editBtn} onClick={() => handleApprove(comment.id)}>核准</button>
                    )}
                    {comment.status !== 'rejected' && (
                      <button
                        className={styles.editBtn}
                        style={{ background: 'var(--color-warning, #f59e0b)', color: 'white' }}
                        onClick={() => handleReject(comment.id)}
                      >
                        拒絕
                      </button>
                    )}
                    <button className={styles.deleteBtn} onClick={() => setDeleteTarget(comment)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>確認刪除</h3>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>確定要刪除這則留言嗎？</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>
                &ldquo;{deleteTarget.body.slice(0, 80)}{deleteTarget.body.length > 80 ? '...' : ''}&rdquo;
              </p>
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
