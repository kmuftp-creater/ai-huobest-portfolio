/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import ImageUploader from '@/components/admin/ImageUploader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from '@/app/admin/admin.module.css';

interface Workshop {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  thumbnail_url: string;
  image_urls: string[];
  embed_type: string;
  html_code: string;
  link_url: string;
  published_at: string;
  status: string;
  created_at: string;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  tagsRaw: string;
  content: string;
  thumbnail_url: string;
  image_urls: string[];
  embed_type: string;
  html_code: string;
  link_url: string;
  published_at: string;
  status: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  title: '', description: '', category: '', tagsRaw: '',
  content: '', thumbnail_url: '', image_urls: [], status: 'published',
  embed_type: 'link', html_code: '', link_url: '', published_at: today(),
};

export default function AdminWorkshopsPage() {
  const supabase = getSupabaseClient();
  const [items, setItems] = useState<Workshop[]>([]);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Workshop | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workshop | null>(null);
  const [page, setPage] = useState(1);

  const [dbCategories, setDbCategories] = useState<string[]>([]);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'workshop').order('name');
    setDbCategories((data ?? []).map((c: { name: string }) => c.name));
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    const { data } = await supabase.from('workshops').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { loadData(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => {
    const fromItems = items.map(i => i.category).filter(Boolean);
    return Array.from(new Set([...dbCategories, ...fromItems])).sort();
  }, [dbCategories, items]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (item: Workshop) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      category: item.category ?? '',
      tagsRaw: (item.tags ?? []).join(', '),
      content: item.content ?? '',
      thumbnail_url: item.thumbnail_url ?? '',
      image_urls: item.image_urls ?? [],
      status: item.status,
      embed_type: (item.embed_type === 'html') ? 'html' : 'link',
      html_code: item.html_code ?? '',
      link_url: item.link_url ?? '',
      published_at: item.published_at ? item.published_at.slice(0, 10) : (item.created_at?.slice(0, 10) ?? today()),
    });
    setShowModal(true);
  };

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSaving(true);
    const tags = form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    // Base payload — original columns that always exist
    const basePayload = {
      title: form.title,
      description: form.description,
      content: form.content,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    // Extended payload — includes new columns (require migration SQL)
    const extPayload = {
      ...basePayload,
      category: form.category,
      tags,
      thumbnail_url: form.thumbnail_url,
      image_urls: form.image_urls,
      embed_type: form.embed_type,
      html_code: form.embed_type === 'html' ? form.html_code : null,
      link_url: form.embed_type === 'link' ? form.link_url : null,
      published_at: form.published_at || today(),
    };

    const tryUpsert = async (payload: typeof extPayload | typeof basePayload) => {
      if (editing) {
        return supabase.from('workshops').update(payload).eq('id', editing.id);
      } else {
        return supabase.from('workshops').insert(payload);
      }
    };

    // Try with extended columns first; if column-not-found error, fall back to base
    let { error } = await tryUpsert(extPayload);
    if (error && (error.message.includes('column') || error.message.includes('does not exist'))) {
      const result = await tryUpsert(basePayload);
      error = result.error;
    }

    setSaving(false);
    if (error) {
      alert(`儲存失敗：${error.message}`);
      return;
    }
    setShowModal(false);
    await loadData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('workshops').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  };

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Image upload for toolbar
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(`workshops/${fileName}`, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(`workshops/${fileName}`);
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

  // Markdown toolbar
  const contentRef = useRef<HTMLTextAreaElement>(null);
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

  const PAGE_SIZE = 21;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminShell pageTitle="工作坊管理" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>工作坊列表</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAdd}>＋ 新增工作坊</button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>標題</th><th>分類</th><th>狀態</th><th>發布日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {pagedItems.length === 0
              ? <tr><td colSpan={5}><div className={styles.emptyState}><div className={styles.emptyIcon}>📅</div><p>尚無工作坊資料</p></div></td></tr>
              : pagedItems.map(item => (
                <tr key={item.id}>
                  <td className={styles.truncate}>{item.title}</td>
                  <td>{item.category ?? ''}</td>
                  <td><span className={`${styles.badge} ${item.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>{item.status === 'published' ? '已發布' : '草稿'}</span></td>
                  <td>{(item.published_at ?? item.created_at)?.slice(0, 10)}</td>
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
          <div className={styles.modal} style={{ maxWidth: 900 }}>
            <div className={styles.modalHeader}>
              <h3>{editing ? '編輯工作坊' : '新增工作坊'}</h3>
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
                    <label>簡短描述</label>
                    <textarea value={form.description} onChange={e => setField('description', e.target.value)} style={{ minHeight: 120 }} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>分類</label>
                    <input
                      list="workshop-categories"
                      value={form.category}
                      onChange={e => setField('category', e.target.value)}
                      placeholder="輸入或選擇分類"
                    />
                    <datalist id="workshop-categories">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className={styles.formGroup}>
                    <label>工作坊說明（Markdown 編輯器，工具列可插入格式與圖片）</label>
                    {/* Hidden file input for image toolbar button */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={imgInputRef}
                      style={{ display: 'none' }}
                      onChange={handleImgFileChange}
                    />
                    <div className={styles.markdownEditorWrap}>
                      {/* Toolbar */}
                      <div className={styles.markdownToolbar}>
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdBold}`} title="粗體 (Ctrl+B)" onClick={() => insertMarkdown('bold')}>B</button>
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdItalic}`} title="斜體 (Ctrl+I)" onClick={() => insertMarkdown('italic')}>I</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="標題一" onClick={() => insertMarkdown('h1')}>H1</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="標題二" onClick={() => insertMarkdown('h2')}>H2</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="標題三" onClick={() => insertMarkdown('h3')}>H3</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="無序清單" onClick={() => insertMarkdown('ul')}>≡</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="有序清單" onClick={() => insertMarkdown('ol')}>1.</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="引用" onClick={() => insertMarkdown('quote')}>&quot;</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="行內程式碼" onClick={() => insertMarkdown('code')}>&lt;/&gt;</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="程式碼區塊" onClick={() => insertMarkdown('codeblock')}>{ '{=}' }</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="超連結" onClick={() => insertMarkdown('link')}>URL</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="水平線" onClick={() => insertMarkdown('hr')}>―</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={styles.markdownToolbarBtn} title="紅色文字" onClick={() => insertMarkdown('colorRed')} style={{color:'#ef4444'}}>紅</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="藍色文字" onClick={() => insertMarkdown('colorBlue')} style={{color:'#3b82f6'}}>藍</button>
                        <button type="button" className={styles.markdownToolbarBtn} title="綠色文字" onClick={() => insertMarkdown('colorGreen')} style={{color:'#22c55e'}}>綠</button>
                        <span className={styles.mdSep} />
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdImgBtn}`} title="上傳圖片並插入" onClick={() => { setShowImgUrlInput(false); imgInputRef.current?.click(); }} disabled={imgUploading}>{imgUploading ? '上傳中…' : '⬡ 上傳圖片'}</button>
                        <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdImgBtn}`} title="輸入網址插入圖片" onClick={() => { setImgToInsert(null); setShowImgUrlInput(v => !v); }}>🔗 網址插入</button>
                      </div>
                      <div className={styles.markdownToolbar} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 0, paddingBottom: 6 }}>
                        {['😊','😄','😂','🤣','😍','🤩','😋','😎','😏','🙃','😅','😴','🥺','😢','😭','😤','😱','🥴','🤡','👻','💀','👽','🤖','💩','👍','💪','🙏','👉','👇','❤️','🌟','💯','🎉','🚀','📌','📝','🎯','💰','📈','🔔','📣','💻','📱','🏆','⚠️','🛑','✔','✘','➤','▶','🔥','✨','💡','✅'].map(e => (
                          <button key={e} type="button" className={styles.markdownToolbarBtn} style={{ padding: '2px 6px', fontSize: 14 }} onClick={() => insertMarkdown('emoji', e)}>{e}</button>
                        ))}
                      </div>

                      {/* URL image input panel */}
                      {showImgUrlInput && (
                        <div className={styles.imgInsertPanel}>
                          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>圖片網址：</span>
                          <input
                            type="url"
                            value={imgUrlInput}
                            onChange={e => setImgUrlInput(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            style={{ flex: 1, padding: '4px 10px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)', minWidth: 200 }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (imgUrlInput.trim()) { setImgToInsert({ url: imgUrlInput.trim() }); setShowImgUrlInput(false); setImgUrlInput(''); } } }}
                          />
                          <button type="button" className={`${styles.markdownToolbarBtn} ${styles.mdImgBtn}`} onClick={() => { if (imgUrlInput.trim()) { setImgToInsert({ url: imgUrlInput.trim() }); setShowImgUrlInput(false); setImgUrlInput(''); } }}>預覽 / 插入</button>
                          <button type="button" className={styles.markdownToolbarBtn} style={{ color: 'var(--color-danger)' }} onClick={() => { setShowImgUrlInput(false); setImgUrlInput(''); }}>取消</button>
                        </div>
                      )}

                      {/* Image insert panel (shown after upload or URL input) */}
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
                            placeholder={'## 課程簡介\n- 特色一\n- 特色二\n\n## 課程內容\n詳細說明...'}
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
                  <div className={styles.formGroup}>
                    <label>標籤（逗號分隔）</label>
                    <input
                      value={form.tagsRaw}
                      onChange={e => setField('tagsRaw', e.target.value)}
                      placeholder="例：兩性關係, 溝通技巧, 心理成長"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>封面圖片</label>
                    <ImageUploader
                      bucket="assets"
                      folder="workshops"
                      onUploadSuccess={(url) => setField('thumbnail_url', url)}
                      currentImageUrl={form.thumbnail_url}
                    />
                    <input
                      value={form.thumbnail_url}
                      onChange={e => setField('thumbnail_url', e.target.value)}
                      placeholder="或直接輸入網址"
                      style={{ marginTop: 8 }}
                    />
                  </div>

                  {/* Demo / 展示方式 */}
                  <div className={styles.formGroup}>
                    <label>Demo 展示方式</label>
                    <select value={form.embed_type} onChange={e => setField('embed_type', e.target.value)}>
                      <option value="link">輸入連結網址（前台點 Demo 按鈕開啟此網址）</option>
                      <option value="html">內嵌 HTML 應用（前台點 Demo 按鈕開啟互動頁面）</option>
                    </select>
                  </div>

                  {form.embed_type === 'link' && (
                    <div className={styles.formGroup}>
                      <label>連結網址</label>
                      <input
                        type="url"
                        value={form.link_url}
                        onChange={e => setField('link_url', e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                  )}

                  {form.embed_type === 'html' && (
                    <div className={styles.formGroup}>
                      <label>HTML 程式碼（完整 HTML 頁面，將以 iframe 方式在我們網站上展示）</label>
                      <textarea
                        value={form.html_code}
                        onChange={e => setField('html_code', e.target.value)}
                        style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 13 }}
                        placeholder={'<!DOCTYPE html>\n<html>\n<body>\n  <!-- 你的 HTML 程式碼 -->\n</body>\n</html>'}
                      />
                    </div>
                  )}

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>狀態</label>
                      <select value={form.status} onChange={e => setField('status', e.target.value)}>
                        <option value="published">已發布</option>
                        <option value="draft">草稿</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>發布日期（留空預設今日）</label>
                      <input
                        type="date"
                        value={form.published_at}
                        onChange={e => setField('published_at', e.target.value)}
                      />
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
