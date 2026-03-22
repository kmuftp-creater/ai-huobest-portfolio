'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Brain, ExternalLink, Link2, Search, Play, Share2 } from 'lucide-react';
import styles from './projects.module.css';

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  tech_tags: string[];
  category: string;
  demo_url: string;
  source_url: string;
  created_at: string;
  published_at: string;
  thumbnail_url: string;
  embed_type: string;   // 'standard' | 'html' | 'link'
  html_code: string;
  link_url: string;
  _type: 'project';
}

interface SharedProject {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  html_code: string;
  embed_type: string;
  category: string;
  created_at: string;
  _type: 'shared';
}

type Item = Project | SharedProject;

const displayDate = (item: Item) => {
  if (item._type === 'project') {
    return ((item as Project).published_at ?? item.created_at)?.slice(0, 10);
  }
  return item.created_at?.slice(0, 10);
};

const PAGE_SIZE = 21;

export default function ProjectsPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.from('projects').select('*').eq('status', 'published').order('created_at', { ascending: false })
      .then(({ data }) => setProjects((data ?? []).map((p: Omit<Project, '_type'>) => ({ ...p, _type: 'project' as const }))));
    supabase.from('shared_projects').select('*').eq('status', 'published').order('created_at', { ascending: false })
      .then(({ data }) => setSharedProjects((data ?? []).map((p: Omit<SharedProject, '_type'>) => ({ ...p, _type: 'shared' as const }))));
  }, []);

  const allItems: Item[] = useMemo(() => {
    return [...projects, ...sharedProjects].sort((a, b) => {
      const da = displayDate(a) ?? '';
      const db = displayDate(b) ?? '';
      return db.localeCompare(da);
    });
  }, [projects, sharedProjects]);

  const categories = useMemo(() =>
    Array.from(new Set(allItems.map(i => i.category).filter(Boolean))),
    [allItems]
  );

  const filtered = useMemo(() => {
    setPage(1);
    return allItems.filter(item => {
      const matchCat = !categoryFilter || item.category === categoryFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        (item._type === 'project' && (item as Project).tags?.some(tg => tg.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [allItems, search, categoryFilter]);

  const getDisplayTags = (item: Project) =>
    item.tags?.length ? item.tags : (item.tech_tags ?? []);

  const handleProjectClick = (p: Project) => {
    if (p.embed_type === 'html') {
      window.open(`/app/${p.id}`, '_blank');
    } else if (p.embed_type === 'link' && p.link_url) {
      window.open(p.link_url, '_blank');
    }
    // 'standard' type uses Link component — handled in JSX
  };

  const handleSharedClick = (item: SharedProject) => {
    if (item.embed_type === 'html') {
      window.open(`/app/${item.id}`, '_blank');
    } else if (item.link_url) {
      window.open(item.link_url, '_blank');
    }
  };

  const getEmbedBadgeLabel = (type: string) => {
    if (type === 'html') return '互動應用';
    if (type === 'link') return '外部連結';
    return null;
  };

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <h1 className="section-title">{t('projects.title')}</h1>
          <p className="section-subtitle">{t('projects.subtitle')}</p>

          {/* Search bar */}
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="搜尋作品名稱、分類、標籤…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className={styles.categoryFilter}>
              <button
                className={`${styles.filterChip} ${!categoryFilter ? styles.filterActive : ''}`}
                onClick={() => setCategoryFilter('')}
              >全部</button>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`${styles.filterChip} ${categoryFilter === cat ? styles.filterActive : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >{cat}</button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <Brain size={48} />
              <p>{t('projects.no_projects')}</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => {
                if (item._type === 'project') {
                  const p = item as Project;
                  const isStandard = !p.embed_type || p.embed_type === 'standard';
                  const embedBadge = getEmbedBadgeLabel(p.embed_type);
                  const cardContent = (
                    <>
                      <div className={styles.thumb} style={{ position: 'relative' }}>
                        {p.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div className={styles.thumbPlaceholder}>
                            {p.embed_type === 'html' ? <Play size={32} /> : p.embed_type === 'link' ? <ExternalLink size={32} /> : <Brain size={32} />}
                          </div>
                        )}
                        {embedBadge && <span className={styles.embedBadge}>{embedBadge}</span>}
                      </div>
                      <div className={styles.body}>
                        {p.category && <span className={styles.categoryBadge}>{p.category}</span>}
                        <h3 className={styles.title}>{p.title}</h3>
                        <p className={styles.desc}>{p.description}</p>
                        <div className={styles.tags}>
                          {getDisplayTags(p).slice(0, 3).map(tag => (
                            <span key={tag} className="badge badge-primary">{tag}</span>
                          ))}
                        </div>
                        <div className={styles.links}>
                          {p.demo_url && <span className={styles.linkIcon}><ExternalLink size={14} /></span>}
                          {p.source_url && <span className={styles.linkIcon}><Link2 size={14} /></span>}
                          <span className={styles.date}>{displayDate(item)}</span>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <Link href={`/projects/${p.id}`} key={`p-${p.id}`} className={styles.card}>
                      {cardContent}
                    </Link>
                  );
                } else {
                  const s = item as SharedProject;
                  return (
                    <div key={`s-${s.id}`} className={`${styles.card} ${styles.sharedCard}`} onClick={() => handleSharedClick(s)}>
                      <div className={styles.thumb} style={{ position: 'relative' }}>
                        {s.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.image_url} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div className={styles.thumbPlaceholder}>
                            {s.embed_type === 'html' ? <Play size={32} /> : <Share2 size={32} />}
                          </div>
                        )}
                        <span className={styles.embedBadge}>
                          {s.embed_type === 'html' ? '互動應用' : '外部連結'}
                        </span>
                      </div>
                      <div className={styles.body}>
                        {s.category && <span className={styles.categoryBadge}>{s.category}</span>}
                        <h3 className={styles.title}>{s.title}</h3>
                        <p className={styles.desc}>{s.description}</p>
                        <div className={styles.links}>
                          <span className={styles.linkIcon}>
                            {s.embed_type === 'html' ? <Play size={14} /> : <ExternalLink size={14} />}
                          </span>
                          <span className={styles.date}>{displayDate(item)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
            if (totalPages <= 1) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32, padding: '16px 0' }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 'var(--text-caption)' }}
                >← 上一頁</button>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>{page} / {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 'var(--text-caption)' }}
                >下一頁 →</button>
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
