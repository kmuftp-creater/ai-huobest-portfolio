'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { BookOpen, Copy, Check, X, ExternalLink, Search } from 'lucide-react';
import styles from './skills.module.css';

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
  created_at: string;
}

const PAGE_SIZE = 21;

function SkillsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('skills')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => setSkills(data ?? []));
  }, []);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && skills.length > 0) {
      const found = skills.find(s => s.id === openId);
      if (found) setSelectedSkill(found);
    }
  }, [searchParams, skills]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(skills.map(s => s.category).filter(Boolean)));
    return cats;
  }, [skills]);

  const filtered = useMemo(() => {
    setPage(1);
    return skills.filter(s => {
      const matchCat = !categoryFilter || s.category === categoryFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.tags?.some(tag => tag.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [skills, categoryFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = (str: string) => {
    try { return Boolean(new URL(str)); } catch { return false; }
  };

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <h1 className="section-title">{t('skills.title')}</h1>
          <p className="section-subtitle">{t('skills.subtitle')}</p>

          {/* Search Bar */}
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="搜尋技能名稱、分類、標籤…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className={styles.categoryFilter}>
              <button
                className={`${styles.filterChip} ${!categoryFilter ? styles.filterActive : ''}`}
                onClick={() => setCategoryFilter('')}
              >
                {t('skills.filter_all')}
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`${styles.filterChip} ${categoryFilter === cat ? styles.filterActive : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={48} />
              <p>{t('skills.no_skills')}</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(skill => (
                <div key={skill.id} className={styles.card} onClick={() => setSelectedSkill(skill)}>
                  <div className={styles.cardIcon}>
                    <BookOpen size={24} />
                  </div>
                  <div className={styles.cardMeta}>
                    {skill.category && (
                      <button
                        className={`badge badge-accent ${styles.categoryBadge}`}
                        onClick={e => { e.stopPropagation(); setCategoryFilter(skill.category); }}
                      >
                        {skill.category}
                      </button>
                    )}
                    <span className="badge badge-primary">{t(`common.difficulty_${skill.difficulty}`)}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{skill.title}</h3>
                  <p className={styles.cardDesc}>{skill.description}</p>
                  <div className={styles.cardTags}>
                    {skill.tags?.map(tag => (
                      <span key={tag} className={styles.tag}>#{tag}</span>
                    ))}
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 'auto' }}>
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

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="modal-backdrop" onClick={() => setSelectedSkill(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedSkill.title}</h2>
              <button onClick={() => setSelectedSkill(null)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {/* Meta */}
            <div className={styles.modalMeta}>
              {selectedSkill.category && (
                <span className="badge badge-accent">{selectedSkill.category}</span>
              )}
              <span className="badge badge-primary">{t(`common.difficulty_${selectedSkill.difficulty}`)}</span>
              {selectedSkill.tags?.map(tag => (
                <span key={tag} className="badge badge-primary" style={{ opacity: 0.7 }}>#{tag}</span>
              ))}
            </div>

            {/* Description */}
            {selectedSkill.description && (
              <div className={styles.modalSection}>
                <p className={styles.modalText}>{selectedSkill.description}</p>
              </div>
            )}

            {/* Copy button at top */}
            <div className={styles.modalActions} style={{ borderTop: 'none', paddingTop: 0, marginBottom: 'var(--space-5)' }}>
              <button className="btn btn-primary" onClick={() => handleCopy(selectedSkill.content)}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('skills.copied') : t('skills.copy')}
              </button>
            </div>

            {/* Skill Content in code box */}
            <div className={styles.modalSection}>
              <h3 className={styles.modalLabel}>{t('skills.content')}</h3>
              <div className={styles.contentBox}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {selectedSkill.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* How to use (使用說明) */}
            {selectedSkill.how_to_use && (
              <div className={styles.modalSection}>
                <h3 className={styles.modalLabel}>{t('skills.how_to_use')}</h3>
                <div className={styles.contentBox}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{selectedSkill.how_to_use}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Source with hyperlink */}
            {selectedSkill.source && (
              <div className={styles.modalSection}>
                <h3 className={styles.modalLabel}>{t('skills.source')}</h3>
                {isUrl(selectedSkill.source) ? (
                  <a href={selectedSkill.source} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                    <ExternalLink size={14} />
                    {selectedSkill.source}
                  </a>
                ) : (
                  <p className={styles.modalText}>{selectedSkill.source}</p>
                )}
              </div>
            )}

            {/* Copy button at bottom */}
            <div className={styles.modalActions}>
              <button className="btn btn-primary" onClick={() => handleCopy(selectedSkill.content)}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('skills.copied') : t('skills.copy')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense fallback={null}>
      <SkillsContent />
    </Suspense>
  );
}
