/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import ImageUploader from '@/components/admin/ImageUploader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import styles from '@/app/admin/admin.module.css';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  tech_tags: string[];
  demo_url: string;
  source_url: string;
  content: string;
  thumbnail_url: string;
  image_urls: string[];
  status: string;
  created_at: string;
  embed_type: string;
  html_code: string;
  link_url: string;
  published_at: string;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  tagsRaw: string;
  demo_url: string;
  source_url: string;
  content: string;
  thumbnail_url: string;
  image_urls: string[];
  status: string;
  embed_type: string;  // 'standard' | 'html' | 'link'
  html_code: string;
  link_url: string;
  published_at: string;
  unlock_points: number | '';
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  title: '', description: '', category: '', tagsRaw: '', demo_url: '', source_url: '',
  content: '', thumbnail_url: '', image_urls: [], status: 'published',
  embed_type: 'link', html_code: '', link_url: '', published_at: today(),
  unlock_points: '',
};

export default function AdminProjectsPage() {
  const supabase = getSupabaseClient();
  const [items, setItems] = useState<Project[]>([]);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<string[]>([]);


  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('name').eq('type', 'project').order('name');
    setCategories((data ?? []).map(c => c.name));
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { loadData(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (item: Project) => {
    setEditing(item);
    // Merge old fields into content if content is empty
    let mergedContent = item.content ?? '';
    if (!mergedContent) {
      const parts: string[] = [];
      if ((item as unknown as Record<string, unknown>).overview) parts.push(String((item as unknown as Record<string, unknown>).overview));
      if ((item as unknown as Record<string, unknown>).tech_details) parts.push(String((item as unknown as Record<string, unknown>).tech_details));
      mergedContent = parts.join('\n\n');
    }
    // Merge tags: prefer tags, fallback to tech_tags
    const existingTags = item.tags?.length ? item.tags : (item.tech_tags ?? []);
    setForm({
      title: item.title,
      description: item.description ?? '',
      category: item.category ?? '',
      tagsRaw: existingTags.join(', '),
      demo_url: item.demo_url ?? '',
      source_url: item.source_url ?? '',
      content: mergedContent,
      thumbnail_url: item.thumbnail_url ?? '',
      image_urls: item.image_urls ?? [],
      status: item.status,
      // 'standard' 是舊格式，統一轉為 'link'，並用 demo_url 補入 link_url
      embed_type: (item.embed_type === 'html') ? 'html' : 'link',
      html_code: item.html_code ?? '',
      link_url: item.link_url ?? item.demo_url ?? '',
      published_at: item.published_at ? item.published_at.slice(0, 10) : (item.created_at?.slice(0, 10) ?? today()),
      unlock_points: (item as unknown as Record<string, unknown>).unlock_points ? Number((item as unknown as Record<string, unknown>).unlock_points) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSaving(true);
    const tags = form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    // Base payload — columns that always exist
    const basePayload = {
      title: form.title,
      description: form.description,
      category: form.category,
      tags,
      tech_tags: tags,
      demo_url: form.demo_url,
      source_url: form.source_url,
      content: form.content,
      overview: form.content,
      thumbnail_url: form.thumbnail_url,
      image_urls: form.image_urls,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    // Extended payload — includes new columns (require migration SQL)
    const extPayload = {
      ...basePayload,
      embed_type: form.embed_type,
      html_code: form.embed_type === 'html' ? form.html_code : null,
      link_url: form.embed_type === 'link' ? form.link_url : null,
      published_at: form.published_at || today(),
      unlock_points: form.unlock_points === '' ? null : Number(form.unlock_points),
    };

    const tryUpsert = async (payload: typeof extPayload | typeof basePayload) => {
      if (editing) {
        return supabase.from('projects').update(payload).eq('id', editing.id);
      } else {
        return supabase.from('projects').insert(payload);
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
    await supabase.from('projects').delete().eq('id', deleteTarget.id);
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
      const { error: uploadError } = await supabase.storage.from('assets').upload(`projects/${fileName}`, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(`projects/${fileName}`);
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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const getDisplayTags = (item: Project) => {
    return item.tags?.length ? item.tags : (item.tech_tags ?? []);
  };

  const PAGE_SIZE = 21;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pagedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminShell pageTitle="AI 作品介紹" userEmail={email}>
      <div className={styles.pageHeader}>
        <h2>作品列表</h2>
        <button id="add-project-btn" className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAdd}>＋ 新增作品</button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>標題</th><th>類型</th><th>標籤</th><th>狀態</th><th>發布日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {pagedItems.length === 0
              ? <tr><td colSpan={6}><div className={styles.emptyState}><div className={styles.emptyIcon}>🗂</div><p>尚無作品資料</p></div></td></tr>
              : pagedItems.map(item => (
                <tr key={item.id}>
                  <td className={styles.truncate}>{item.title}</td>
                  <td>
                    <span className={styles.badge} style={{
                      background: item.embed_type === 'html' ? '#dbeafe' : item.embed_type === 'link' ? '#fef3c7' : 'var(--color-primary-light)',
                      color: item.embed_type === 'html' ? '#1d4ed8' : item.embed_type === 'link' ? '#92400e' : 'var(--color-primary)',
                    }}>
                      {item.embed_type === 'html' ? '內嵌應用' : item.embed_type === 'link' ? '外部連結' : '一般作品'}
                    </span>
                  </td>
                  <td><div className={styles.tagList}>{getDisplayTags(item).slice(0, 3).map(t => <span key={t} className={styles.tag}>{t}</span>)}</div></td>
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
                    <label>簡短描述</label>
                    <textarea value={form.description} onChange={e => setField('description', e.target.value)} style={{ minHeight: 120 }} />
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
                    <label>作品說明（Markdown 編輯器，工具列可插入格式與圖片）</label>
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
                            placeholder={'## 核心功能\n- 功能一\n- 功能二\n\n## 技術細節\n使用技術說明...'}
                          />
                        </div>
                        <div className={styles.markdownPane}>
                          <div className={styles.markdownPaneLabel}>預覽</div>
                          <div className={styles.markdownPreview}>
                            {form.content
                              ? <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>{form.content}</ReactMarkdown>
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
                      placeholder="例：Next.js, Supabase, AI"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>封面圖片</label>
                    <ImageUploader
                      bucket="assets"
                      folder="projects"
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

                  <div className={styles.formGroup}>
                    <label>Source URL（原始碼連結，選填）</label>
                    <input value={form.source_url} onChange={e => setField('source_url', e.target.value)} placeholder="https://github.com/..." />
                  </div>

                  {/* 積分解鎖設定 */}
                  <div className={styles.formGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      🔒 積分解鎖設定
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.unlock_points !== ''}
                          onChange={e => setField('unlock_points', e.target.checked ? 50 : '')}
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13 }}>開啟積分解鎖</span>
                      </label>
                    </label>
                    {form.unlock_points !== '' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <span style={{ fontSize: 13 }}>解鎖所需積分：</span>
                        <input
                          type="number"
                          min={1}
                          value={form.unlock_points}
                          onChange={e => setField('unlock_points', parseInt(e.target.value) || 50)}
                          style={{ width: 100 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          開啟後，Demo 展示、連結網址、Source URL 將隱藏，需積分兌換才可查看
                        </span>
                      </div>
                    )}
                  </div>

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
