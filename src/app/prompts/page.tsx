'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Search, X, Copy, Check, Zap, LogIn, Plus } from 'lucide-react';
import styles from './prompts.module.css';

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
  created_at: string;
}

const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'] as const;
const PAGE_SIZE = 21;

function PromptsContent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [showAuthor, setShowAuthor] = useState(true);
  const [addForm, setAddForm] = useState({ title: '', category: '', difficulty: 'beginner', description: '', content: '', input_example: '', output_example: '', tagsRaw: '' });
  const setAddField = (k: keyof typeof addForm, v: string) => setAddForm(f => ({ ...f, [k]: v }));

  const userEmail = user?.email ?? null;
  const userName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? null;

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.from('prompts').select('*').eq('status', 'published').order('created_at', { ascending: false })
      .then(({ data }) => setPrompts(data ?? []));
  }, []);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && prompts.length > 0) {
      const found = prompts.find(p => p.id === openId);
      if (found) setSelectedPrompt(found);
    }
  }, [searchParams, prompts]);

  // Dynamic categories from DB data
  const categories = useMemo(() => {
    return Array.from(new Set(prompts.map(p => p.category).filter(Boolean)));
  }, [prompts]);

  const getCategoryLabel = (cat: string) => {
    const key = `prompts.category_${cat}`;
    const translated = t(key);
    return translated !== key ? translated : cat;
  };

  const filtered = useMemo(() => {
    setPage(1);
    return prompts.filter(p => {
      const matchSearch = !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      const matchDifficulty = difficultyFilter === 'all' || p.difficulty === difficultyFilter;
      return matchSearch && matchCategory && matchDifficulty;
    });
  }, [prompts, search, categoryFilter, difficultyFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emptyAddForm = { title: '', category: '', difficulty: 'beginner', description: '', content: '', input_example: '', output_example: '', tagsRaw: '' };

  const handleAddSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!addForm.title.trim() || !addForm.description.trim() || !addForm.content.trim()) {
      alert('請填寫標題、描述和提示詞內容');
      return;
    }
    setAddSaving(true);
    const supabase = getSupabaseClient();
    const tags = addForm.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const author = showAuthor ? (userName ?? 'admin') : 'admin';
    const { error } = await supabase.from('prompts').insert({
      title: addForm.title.trim(),
      category: addForm.category.trim(),
      difficulty: addForm.difficulty,
      description: addForm.description.trim(),
      content: addForm.content.trim(),
      input_example: addForm.input_example.trim(),
      output_example: addForm.output_example.trim(),
      tags,
      author,
      status: 'pending_review',
    });
    setAddSaving(false);
    if (error) { alert(`提交失敗：${error.message}`); return; }
    setShowAddModal(false);
    setAddForm(emptyAddForm);
    setShowAuthor(true);
    alert('提交成功！待管理員審核後將會發布。');
  };

  const getCategoryBadgeClass = (cat: string) => {
    const map: Record<string, string> = { analysis: 'badge-primary', creation: 'badge-accent', optimization: 'badge-success', strategy: 'badge-warning' };
    return map[cat] ?? 'badge-primary';
  };

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <h1 className="section-title">{t('prompts.title')}</h1>
          <p className="section-subtitle">{t('prompts.subtitle')}</p>

          {/* Search & Filters */}
          <div className={styles.controls}>
            <div className={styles.searchBar}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('prompts.search_placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.clearBtn} onClick={() => setSearch('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className={styles.filters}>
              {/* Dynamic Category Filter */}
              {categories.length > 0 && (
                <div className={styles.filterGroup}>
                  <button
                    className={`${styles.filterChip} ${!categoryFilter ? styles.filterActive : ''}`}
                    onClick={() => setCategoryFilter('')}
                  >
                    {t('prompts.filter_all')}
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`${styles.filterChip} ${categoryFilter === cat ? styles.filterActive : ''}`}
                      onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.filterGroup} style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: 'var(--space-4)' }}>
                {DIFFICULTIES.map(diff => (
                  <button
                    key={diff}
                    className={`${styles.filterChip} ${difficultyFilter === diff ? styles.filterActive : ''}`}
                    onClick={() => setDifficultyFilter(diff)}
                  >
                    {diff === 'all' ? t('prompts.filter_all') : t(`common.difficulty_${diff}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Login CTA / Add Button */}
          {!userEmail ? (
            <div className={styles.loginCta}>
              <LogIn size={16} />
              <span>{t('prompts.login_to_submit')}</span>
              <button className="btn btn-primary btn-sm" onClick={() => {
                getSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
              }}>
                {t('prompts.login_google')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} style={{ marginRight: 6 }} />
                新增提示詞
              </button>
            </div>
          )}

          {/* Prompt Cards */}
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <Zap size={48} />
              <p>{t('prompts.no_prompts')}</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(prompt => (
                <div
                  key={prompt.id}
                  className={styles.card}
                  onClick={() => setSelectedPrompt(prompt)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.cardMeta}>
                    <span className={`badge ${getCategoryBadgeClass(prompt.category)}`}>
                      {getCategoryLabel(prompt.category)}
                    </span>
                    <span className="badge badge-primary">
                      {t(`common.difficulty_${prompt.difficulty}`)}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>{prompt.title}</h3>
                  <p className={styles.cardDesc}>{prompt.description}</p>
                  <div className={styles.cardTags}>
                    {prompt.tags?.map(tag => (
                      <span key={tag} className={styles.tag}>#{tag}</span>
                    ))}
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={e => { e.stopPropagation(); setSelectedPrompt(prompt); }}
                    style={{ width: '100%', marginTop: 'auto' }}
                  >
                    {t('prompts.view_detail')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
            if (totalPages <= 1) return null;
            return (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← 上一頁</button>
                <span className={styles.pageInfo}>{page} / {totalPages}</span>
                <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一頁 →</button>
              </div>
            );
          })()}
        </section>
      </div>

      {/* Prompt Detail Modal */}
      {selectedPrompt && (
        <div className="modal-backdrop" onClick={() => setSelectedPrompt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedPrompt.title}</h2>
              <button onClick={() => setSelectedPrompt(null)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalMeta}>
              <span className={`badge ${getCategoryBadgeClass(selectedPrompt.category)}`}>
                {getCategoryLabel(selectedPrompt.category)}
              </span>
              <span className="badge badge-primary">
                {t(`common.difficulty_${selectedPrompt.difficulty}`)}
              </span>
              {selectedPrompt.author && (
                <span className={styles.authorBadge}>✍ {selectedPrompt.author}</span>
              )}
            </div>

            {/* Tags */}
            {selectedPrompt.tags?.length > 0 && (
              <div className={styles.modalTagRow}>
                {selectedPrompt.tags.map(tag => (
                  <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Copy button at top */}
            <div className={styles.modalActions} style={{ borderTop: 'none', paddingTop: 0, marginBottom: 'var(--space-4)' }}>
              <button className="btn btn-primary" onClick={() => handleCopy(selectedPrompt.content)}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('prompts.copied') : t('prompts.copy')}
              </button>
            </div>

            {/* Content */}
            <div className={styles.modalSection}>
              <div className={styles.exampleBox}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {selectedPrompt.content}
                </ReactMarkdown>
              </div>
            </div>

            {selectedPrompt.input_example && (
              <div className={styles.modalSection}>
                <h3 className={styles.modalLabel}>{t('prompts.input_example')}</h3>
                <div className={styles.exampleBox}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {selectedPrompt.input_example}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {selectedPrompt.output_example && (
              <div className={styles.modalSection}>
                <h3 className={styles.modalLabel}>{t('prompts.output_example')}</h3>
                <div className={styles.exampleBox}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {selectedPrompt.output_example}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Copy button at bottom */}
            <div className={styles.modalActions}>
              <button className="btn btn-primary" onClick={() => handleCopy(selectedPrompt.content)}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('prompts.copied') : t('prompts.copy')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 新增提示詞 Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">新增提示詞</h2>
              <button onClick={() => setShowAddModal(false)} className={styles.closeBtn}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 0 8px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>標題 *</label>
                <input style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
                  value={addForm.title} onChange={e => setAddField('title', e.target.value)} placeholder="提示詞標題" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>分類</label>
                  <input list="add-prompt-cats" style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
                    value={addForm.category} onChange={e => setAddField('category', e.target.value)} placeholder="例：行銷、創作" />
                  <datalist id="add-prompt-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>難度</label>
                  <select style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
                    value={addForm.difficulty} onChange={e => setAddField('difficulty', e.target.value)}>
                    <option value="beginner">初級</option>
                    <option value="intermediate">中級</option>
                    <option value="advanced">進階</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>描述 *</label>
                <input style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
                  value={addForm.description} onChange={e => setAddField('description', e.target.value)} placeholder="簡短描述這個提示詞的用途" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>提示詞內容 *</label>
                <textarea style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', minHeight: 160, resize: 'vertical', fontFamily: 'inherit' }}
                  value={addForm.content} onChange={e => setAddField('content', e.target.value)} placeholder="輸入提示詞內容，支援 Markdown" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>輸入範例（選填）</label>
                <textarea style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  value={addForm.input_example} onChange={e => setAddField('input_example', e.target.value)} placeholder="提示詞的輸入範例" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>輸出範例（選填）</label>
                <textarea style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  value={addForm.output_example} onChange={e => setAddField('output_example', e.target.value)} placeholder="AI 輸出的預期結果範例" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>標籤（逗號分隔，選填）</label>
                <input style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
                  value={addForm.tagsRaw} onChange={e => setAddField('tagsRaw', e.target.value)} placeholder="例：行銷, ChatGPT, 寫作" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                <label style={{ fontSize: 14, margin: 0 }}>顯示作者名稱？</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="showAuthor" checked={showAuthor} onChange={() => setShowAuthor(true)} />
                  是（顯示：{userName ?? ''}）
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="showAuthor" checked={!showAuthor} onChange={() => setShowAuthor(false)} />
                  否（顯示：admin）
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={addSaving}>{addSaving ? '提交中...' : '提交'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromptsPage() {
  return (
    <Suspense fallback={null}>
      <PromptsContent />
    </Suspense>
  );
}
