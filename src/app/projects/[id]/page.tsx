'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { ArrowLeft, ExternalLink, Calendar, Brain, Lock, Unlock } from 'lucide-react';
import styles from './detail.module.css';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  tech_tags: string[];
  content: string;
  overview: string;
  demo_url: string;
  source_url: string;
  thumbnail_url: string;
  image_urls: string[];
  created_at: string;
  published_at: string;
  embed_type: string;
  link_url: string;
  unlock_points: number | null;
}

export default function ProjectDetailPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const params = useParams();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => setProject(data ?? null));
  }, [params.id]);

  useEffect(() => {
    if (!user || !project?.unlock_points) return;
    const supabase = getSupabaseClient();
    supabase
      .from('project_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', project.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setIsUnlocked(true); });
    supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setUserPoints(data.points); });
  }, [user, project]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlock = async () => {
    if (!user) {
      getSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
      return;
    }
    setUnlocking(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('unlock_project', { p_project_id: project!.id });
    setUnlocking(false);
    if (error || !data?.success) { alert(data?.error ?? error?.message ?? '解鎖失敗'); return; }
    setIsUnlocked(true);
    if (project?.unlock_points && userPoints !== null) {
      setUserPoints(userPoints - project.unlock_points);
    }
  };

  if (project === undefined) return null;

  if (!project) {
    return (
      <div className="container section">
        <div className={styles.notFound}>
          <Brain size={48} />
          <p>{t('projects.no_projects')}</p>
          <Link href="/projects" className="btn btn-primary">
            <ArrowLeft size={16} /> {t('projects.back')}
          </Link>
        </div>
      </div>
    );
  }

  // Use new tags field, fallback to tech_tags for old data
  const displayTags = project.tags?.length ? project.tags : (project.tech_tags ?? []);
  // Use new content field, fallback to overview for old data
  const displayContent = project.content || project.overview || '';
  // Extra images
  const extraImages = project.image_urls ?? [];

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <Link href="/projects" className={styles.backLink}>
            <ArrowLeft size={16} /> {t('projects.back')}
          </Link>

          <div className={styles.header}>
            <h1 className={styles.title}>{project.title}</h1>
            <div className={styles.meta}>
              <span className={styles.date}>
                <Calendar size={14} /> {t('projects.created_at')}: {project.created_at?.slice(0, 10)}
              </span>
            </div>
            {displayTags.length > 0 && (
              <div className={styles.tags}>
                {displayTags.map(tag => (
                  <span key={tag} className="badge badge-primary">{tag}</span>
                ))}
              </div>
            )}
            {project.description && (
              <p className={styles.description}>{project.description}</p>
            )}
          </div>

          <div className={styles.content}>
            {displayContent && (
              <div className={styles.markdownContent}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    img: ({ node, ...props }) => (
                      <Zoom>
                        <img {...props} style={{ ...props.style, maxWidth: '100%', cursor: 'zoom-in' }} />
                      </Zoom>
                    ),
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            )}

            {extraImages.length > 0 && (
              <div className={styles.imageGallery}>
                {extraImages.map((url, i) => (
                  <img key={i} src={url} alt={`${project.title} ${i + 1}`} className={styles.galleryImage} />
                ))}
              </div>
            )}

            {/* Demo / Source 連結（積分鎖定時隱藏） */}
            {project.unlock_points && !isUnlocked ? (
              <div style={{
                margin: 'var(--space-6) 0',
                padding: '20px 24px',
                border: '1px solid #f59e0b55',
                borderRadius: 12,
                background: 'color-mix(in srgb, #f59e0b 6%, transparent)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Lock size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    Demo 展示、連結網址及 Source URL 需要 <span style={{ color: '#f59e0b' }}>{project.unlock_points} 積分</span>兌換後方可觀看
                  </span>
                </div>
                {user ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px 28px' }}>
                      您目前有 <strong style={{ color: 'var(--color-text)' }}>{userPoints ?? '...'} 積分</strong>
                      {userPoints !== null && userPoints < project.unlock_points && (
                        <span style={{ color: '#ef4444', marginLeft: 8 }}>積分不足，請努力存積分或購買積分喔</span>
                      )}
                    </p>
                    <div style={{ marginLeft: 28 }}>
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking || (userPoints !== null && userPoints < project.unlock_points)}
                        style={{
                          padding: '8px 20px', borderRadius: 8, border: 'none',
                          background: userPoints !== null && userPoints < project.unlock_points ? 'var(--color-border)' : '#f59e0b',
                          color: userPoints !== null && userPoints < project.unlock_points ? 'var(--color-text-muted)' : 'white',
                          fontWeight: 700, fontSize: 14, cursor: unlocking || (userPoints !== null && userPoints < project.unlock_points) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Unlock size={15} />
                        {unlocking ? '處理中...' : '立即兌換'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={handleUnlock}
                    style={{
                      marginLeft: 28, padding: '8px 20px', borderRadius: 8, border: 'none',
                      background: '#f59e0b', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Unlock size={15} />
                    登入後兌換
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.actionLinks}>
                {project.embed_type === 'html' ? (
                  <a href={`/app/${project.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <ExternalLink size={16} /> {t('projects.demo')}
                  </a>
                ) : project.embed_type === 'link' && project.link_url ? (
                  <a href={project.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <ExternalLink size={16} /> {t('projects.demo')}
                  </a>
                ) : project.demo_url ? (
                  <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <ExternalLink size={16} /> {t('projects.demo')}
                  </a>
                ) : null}
                {project.source_url && (
                  <a href={project.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                    {t('projects.source')}
                  </a>
                )}
              </div>
            )}

          </div>
        </section>
      </div>
    </div>
  );
}
