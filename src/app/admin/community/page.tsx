'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from '@/app/admin/admin.module.css';
import { X } from 'lucide-react';

type PostType = 'announcement' | 'wishlist' | 'discussion';

interface ForumPost {
  id: string;
  type: PostType;
  title: string;
  content: string;
  category: string;
  tags: string[];
  link_url: string;
  user_name: string;
  vote_count: number;
  status: string;
  created_at: string;
}

const TYPE_LABELS: Record<PostType, string> = {
  announcement: '📢 公告',
  wishlist: '✨ 許願池',
  discussion: '💬 交流討論',
};

const emptyForm = { title: '', content: '', category: '', tagsRaw: '', link_url: '', status: 'published' };

export default function AdminCommunityPage() {
  const supabase = getSupabaseClient();
  const [userEmail, setUserEmail] = useState('');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [activeTab, setActiveTab] = useState<PostType>('announcement');
  const [deleteTarget, setDeleteTarget] = useState<ForumPost | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Markdown editor state
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgToInsert, setImgToInsert] = useState<{ url: string } | null>(null);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [showImgUrlInput, setShowImgUrlInput] = useState(false);

  const handleImgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(`community/${fileName}`, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(`community/${fileName}`);
      setImgToInsert({ url: publicUrl });
    } catch { /* silent */ }
    finally {
      setImgUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  const confirmInsertImage = (width: string) => {
    const ta = contentRef.current;
    if (!ta || !imgToInsert) return;
    const start = ta.selectionStart;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(start);
    const tag = `\n<img src="${imgToInsert.url}" style="max-width:100%;width:${width}">\n`;
    setField('content', before + tag + after);
    setImgToInsert(null);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + tag.length, start + tag.length); }, 0);
  };

  const insertMarkdown = useCallback((type: string, payload?: string) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    const wrap = (l: string, r: string, placeholder: string) => {
      const inner = sel || placeholder;
      const newVal = before + l + inner + r + after;
      setField('content', newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + l.length, start + l.length + inner.length); }, 0);
    };
    const linePrefix = (prefix: string, placeholder: string) => {
      const inner = sel || placeholder;
      const newVal = before + '\n' + prefix + inner + '\n' + after;
      setField('content', newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1 + inner.length); }, 0);
    };
    switch (type) {
      case 'bold': return wrap('**', '**', '粗體文字');
      case 'italic': return wrap('*', '*', '斜體文字');
      case 'h1': return linePrefix('# ', '標題一');
      case 'h2': return linePrefix('## ', '標題二');
      case 'h3': return linePrefix('### ', '標題三');
      case 'ul': return linePrefix('- ', '清單項目');
      case 'ol': return linePrefix('1. ', '清單項目');
      case 'quote': return linePrefix('> ', '引用文字');
      case 'code': return wrap('`', '`', 'code');
      case 'codeblock': return wrap('\n```\n', '\n```\n', '程式碼區塊');
      case 'colorRed': return wrap('<span style="color:#ef4444">', '</span>', '紅色文字');
      case 'colorBlue': return wrap('<span style="color:#3b82f6">', '</span>', '藍色文字');
      case 'colorGreen': return wrap('<span style="color:#22c55e">', '</span>', '綠色文字');
      case 'emoji': return wrap(payload || '', '', '');
      case 'link': return wrap('[', '](https://)', '連結文字');
      case 'hr': {
        const newVal = before + '\n---\n' + after;
        setField('content', newVal);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 5, start + 5); }, 0);
        break;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? '');
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts(data ?? []);
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { data, error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', deleteTarget.id)
      .select('id');
    if (error) { alert(`刪除失敗：${error.message}`); return; }
    if (!data || data.length === 0) {
      alert('刪除失敗：權限不足。\n請先到 Supabase SQL Editor 執行「升級項目十二」中的 RLS 修正 SQL（補上管理員 Email）。');
      return;
    }
    setDeleteTarget(null);
    loadData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('forum_posts')
      .update({ status })
      .eq('id', id)
      .select('id');
    if (error) { alert(`更新狀態失敗：${error.message}`); return; }
    if (!data || data.length === 0) {
      alert('更新失敗：權限不足。\n請先到 Supabase SQL Editor 執行「升級項目十二」中的 RLS 修正 SQL（補上管理員 Email）。');
      return;
    }
    loadData();
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const tags = form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from('forum_posts').insert({
      type: 'announcement',
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category.trim() || null,
      tags,
      link_url: form.link_url.trim() || null,
      user_id: user?.id,
      user_name: '管理員',
      status: form.status,
    });
    setSaving(false);
    if (error) { alert(`發布失敗：${error.message}`); return; }
    setForm(emptyForm);
    setShowNewModal(false);
    loadData();
  };

  const filtered = posts.filter(p => p.type === activeTab);

  const statusBadge = (s: string) => {
    if (s === 'published') return styles.badgePublished;
    if (s === 'pending') return styles.badgePending;
    return styles.badgeRejected;
  };
  const statusLabel = (s: string) => s === 'published' ? '已發布' : s === 'pending' ? '待審核' : '已拒絕';

  return (
    <AdminShell pageTitle="交流討論管理" userEmail={userEmail}>
      <div className={styles.pageHeader}>
        <h2>交流討論管理</h2>
        {activeTab === 'announcement' && (
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowNewModal(true)}>
            ＋ 發布公告
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['announcement', 'wishlist', 'discussion'] as PostType[]).map(t => (
          <button
            key={t}
            className={`${styles.btn} ${activeTab === t ? styles.btnPrimary : styles.btnSecondary}`}
            style={{ padding: '5px 16px', fontSize: 13 }}
            onClick={() => setActiveTab(t)}
          >
            {TYPE_LABELS[t]} ({posts.filter(p => p.type === t).length})
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>標題</th>
              <th>作者</th>
              {activeTab === 'wishlist' && <th>票數</th>}
              <th>分類</th>
              <th>狀態</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'wishlist' ? 7 : 6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>{activeTab === 'announcement' ? '📢' : activeTab === 'wishlist' ? '✨' : '💬'}</div>
                    <p>尚無{TYPE_LABELS[activeTab]}紀錄</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(post => (
              <tr key={post.id}>
                <td className={styles.truncate} style={{ maxWidth: 200 }} title={post.title}>{post.title}</td>
                <td>{post.user_name}</td>
                {activeTab === 'wishlist' && (
                  <td><strong style={{ color: 'var(--color-primary)' }}>{post.vote_count}</strong></td>
                )}
                <td>{post.category || '-'}</td>
                <td>
                  <span className={`${styles.badge} ${statusBadge(post.status)}`}>
                    {statusLabel(post.status)}
                  </span>
                </td>
                <td>{post.created_at?.slice(0, 10)}</td>
                <td>
                  <div className={styles.actions}>
                    {post.status !== 'published' && (
                      <button className={styles.editBtn} onClick={() => handleStatusChange(post.id, 'published')}>核准</button>
                    )}
                    {post.status === 'published' && (
                      <button
                        className={styles.editBtn}
                        style={{ background: 'var(--color-warning, #f59e0b)', color: 'white' }}
                        onClick={() => handleStatusChange(post.id, 'rejected')}
                      >
                        下架
                      </button>
                    )}
                    <button className={styles.deleteBtn} onClick={() => setDeleteTarget(post)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Announcement Modal */}
      {showNewModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.modalLarge}`}>
            <div className={styles.modalHeader}>
              <h3>發布公告</h3>
              <button className={styles.modalClose} onClick={() => setShowNewModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAnnouncement}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label>標題 *</label>
                    <input
                      value={form.title}
                      onChange={e => setField('title', e.target.value)}
                      placeholder="公告標題"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>內容 *（Markdown 編輯器）</label>
                    <input type="file" accept="image/*" ref={imgInputRef} style={{ display: 'none' }} onChange={handleImgFileChange} />
                    <div className={styles.markdownEditorWrap}>
                      <div className={styles.markdownToolbar}>
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdBold}`} title="粗體" onClick={() => insertMarkdown('bold')}>B</button>
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdItalic}`} title="斜體" onClick={() => insertMarkdown('italic')}>I</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="H1" onClick={() => insertMarkdown('h1')}>H1</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="H2" onClick={() => insertMarkdown('h2')}>H2</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="H3" onClick={() => insertMarkdown('h3')}>H3</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="無序清單" onClick={() => insertMarkdown('ul')}>≡</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="有序清單" onClick={() => insertMarkdown('ol')}>1.</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="引用" onClick={() => insertMarkdown('quote')}>&quot;</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="行內程式碼" onClick={() => insertMarkdown('code')}>&lt;/&gt;</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="超連結" onClick={() => insertMarkdown('link')}>URL</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="水平線" onClick={() => insertMarkdown('hr')}>―</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="紅色" onClick={() => insertMarkdown('colorRed')} style={{color:'#ef4444'}}>紅</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="藍色" onClick={() => insertMarkdown('colorBlue')} style={{color:'#3b82f6'}}>藍</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="綠色" onClick={() => insertMarkdown('colorGreen')} style={{color:'#22c55e'}}>綠</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdImgBtn}`} title="上傳圖片" onClick={() => { setShowImgUrlInput(false); imgInputRef.current?.click(); }} disabled={imgUploading}>{imgUploading ? '上傳中…' : '⬡ 上傳圖片'}</button>
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdImgBtn}`} title="網址插入圖片" onClick={() => { setImgToInsert(null); setShowImgUrlInput(v => !v); }}>🔗 網址插入</button>
                      </div>
                      <div className={styles.markdownToolbar} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 0, paddingBottom: 6 }}>
                        {['😊','😄','😂','🤩','😎','👍','💪','🙏','❤️','🌟','💯','🎉','🚀','📌','📝','🎯','📣','💻','🏆','⚠️','✅','🔥','✨','💡'].map(e => (
                          <button key={e} type="button" className={styles.markdownToolbarBtn} style={{ padding: '2px 6px', fontSize: 14 }} onClick={() => insertMarkdown('emoji', e)}>{e}</button>
                        ))}
                      </div>
                      {showImgUrlInput && (
                        <div className={styles.imgInsertPanel}>
                          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>圖片網址：</span>
                          <input type="url" value={imgUrlInput} onChange={e => setImgUrlInput(e.target.value)} placeholder="https://example.com/image.jpg"
                            style={{ flex: 1, padding: '4px 10px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)', minWidth: 200 }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (imgUrlInput.trim()) { setImgToInsert({ url: imgUrlInput.trim() }); setShowImgUrlInput(false); setImgUrlInput(''); } } }}
                          />
                          <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdImgBtn}`} onClick={() => { if (imgUrlInput.trim()) { setImgToInsert({ url: imgUrlInput.trim() }); setShowImgUrlInput(false); setImgUrlInput(''); } }}>預覽 / 插入</button>
                          <button type="button" className={styles.markdownToolbarBtn} style={{ color: 'var(--color-danger)' }} onClick={() => { setShowImgUrlInput(false); setImgUrlInput(''); }}>取消</button>
                        </div>
                      )}
                      {imgToInsert && (
                        <div className={styles.imgInsertPanel}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgToInsert.url} alt="預覽" className={styles.imgInsertPreview} />
                          <div className={styles.imgInsertControls}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>插入寬度：</span>
                            {[['100%', '全寬'], ['75%', '75%'], ['50%', '50%'], ['300px', '300px']].map(([w, label]) => (
                              <button key={w} type="button" className={styles.markdownToolbarBtn} onClick={() => confirmInsertImage(w)}>{label}</button>
                            ))}
                            <button type="button" className={styles.markdownToolbarBtn} style={{ color: 'var(--color-danger)' }} onClick={() => setImgToInsert(null)}>取消</button>
                          </div>
                        </div>
                      )}
                      <div className={styles.markdownSplit}>
                        <div className={styles.markdownPane}>
                          <div className={styles.markdownPaneLabel}>編輯</div>
                          <textarea
                            ref={contentRef}
                            className={styles.markdownTextarea}
                            value={form.content}
                            onChange={e => setField('content', e.target.value)}
                            placeholder={'## 公告標題\n\n公告內容...'}
                            required
                          />
                        </div>
                        <div className={styles.markdownPane}>
                          <div className={styles.markdownPaneLabel}>預覽</div>
                          <div className={styles.markdownPreview}>
                            {form.content
                              ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{form.content}</ReactMarkdown>
                              : <span className={styles.markdownPreviewEmpty}>（開始輸入後這裡會顯示預覽）</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>分類（選填）</label>
                      <input
                        value={form.category}
                        onChange={e => setField('category', e.target.value)}
                        placeholder="公告分類"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>狀態</label>
                      <select value={form.status} onChange={e => setField('status', e.target.value)}>
                        <option value="published">立即發布</option>
                        <option value="pending">草稿（不公開）</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>相關連結（選填）</label>
                    <input
                      value={form.link_url}
                      onChange={e => setField('link_url', e.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowNewModal(false)}>取消</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
                  {saving ? '發布中...' : '發布公告'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>確認刪除</h3>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}><X size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>確定要刪除「{deleteTarget.title}」嗎？</p>
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
