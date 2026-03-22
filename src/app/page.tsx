'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowRight, Sparkles, Brain, BookOpen } from 'lucide-react';
import styles from './page.module.css';

interface Project {
  id: string;
  title: string;
  description: string;
  tech_tags: string[];
  thumbnail_url: string;
}

interface Prompt {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
}

interface Skill {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

interface Stats {
  projects: number;
  prompts: number;
  skills: number;
}

export default function HomePage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<Stats>({ projects: 0, prompts: 0, skills: 0 });

  useEffect(() => {
    const supabase = getSupabaseClient();
    Promise.all([
      supabase.from('projects').select('id, title, description, tech_tags, thumbnail_url').eq('status', 'published').order('created_at', { ascending: false }).limit(3),
      supabase.from('prompts').select('id, title, description, category, difficulty, tags').eq('status', 'published').order('created_at', { ascending: false }).limit(3),
      supabase.from('skills').select('id, title, description, tags').eq('status', 'published').order('created_at', { ascending: false }).limit(2),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('skills').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    ]).then(([p, pr, sk, pc, prc, skc]) => {
      setProjects(p.data ?? []);
      setPrompts(pr.data ?? []);
      setSkills(sk.data ?? []);
      setStats({ projects: pc.count ?? 0, prompts: prc.count ?? 0, skills: skc.count ?? 0 });
    });
  }, []);

  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroGlow} />
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>AI-Powered Portfolio</span>
          </div>
          <h1 className={styles.heroTitle}>{t('home.hero_title')}</h1>
          <p className={styles.heroSubtitle}>{t('home.hero_subtitle')}</p>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{stats.projects}</span>
              <span className={styles.statLabel}>{t('nav.projects')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{stats.prompts}</span>
              <span className={styles.statLabel}>{t('nav.prompts')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{stats.skills}</span>
              <span className={styles.statLabel}>{t('nav.skills')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Projects */}
      {projects.length > 0 && (
        <section className="section">
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className="section-title">{t('home.latest_projects')}</h2>
                <p className="section-subtitle">{t('projects.subtitle')}</p>
              </div>
              <Link href="/projects" className={styles.viewAll}>
                {t('home.view_all')} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-3">
              {projects.map(project => (
                <Link href={`/projects/${project.id}`} key={project.id} className={styles.projectCard}>
                  <div className={styles.cardThumb}>
                    {project.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.thumbnail_url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        <Brain size={32} />
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{project.title}</h3>
                    <p className={styles.cardDesc}>{project.description}</p>
                    <div className={styles.tags}>
                      {project.tech_tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="badge badge-primary">{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Prompts */}
      {prompts.length > 0 && (
        <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className="section-title">{t('home.latest_prompts')}</h2>
                <p className="section-subtitle">{t('prompts.subtitle')}</p>
              </div>
              <Link href="/prompts" className={styles.viewAll}>
                {t('home.view_all')} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-3">
              {prompts.map(prompt => (
                <Link key={prompt.id} href={`/prompts?open=${prompt.id}`} className={styles.promptCard}>
                  <div className={styles.promptMeta}>
                    <span className={`badge ${prompt.category === 'analysis' ? 'badge-primary' : prompt.category === 'creation' ? 'badge-accent' : prompt.category === 'optimization' ? 'badge-success' : 'badge-warning'}`}>
                      {(() => { const k = `prompts.category_${prompt.category}`; const v = t(k); return v !== k ? v : prompt.category; })()}
                    </span>
                    <span className="badge badge-primary">
                      {(() => { const k = `common.difficulty_${prompt.difficulty}`; const v = t(k); return v !== k ? v : prompt.difficulty; })()}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>{prompt.title}</h3>
                  <p className={styles.cardDesc}>{prompt.description}</p>
                  <div className={styles.tags}>
                    {prompt.tags?.map(tag => (
                      <span key={tag} className={styles.tag}>#{tag}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Skills */}
      {skills.length > 0 && (
        <section className="section">
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className="section-title">{t('home.latest_skills')}</h2>
                <p className="section-subtitle">{t('skills.subtitle')}</p>
              </div>
              <Link href="/skills" className={styles.viewAll}>
                {t('home.view_all')} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-2">
              {skills.map(skill => (
                <Link key={skill.id} href={`/skills?open=${skill.id}`} className={styles.skillCard}>
                  <div className={styles.skillIcon}>
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className={styles.cardTitle}>{skill.title}</h3>
                    <p className={styles.cardDesc}>{skill.description}</p>
                    <div className={styles.tags}>
                      {skill.tags?.map(tag => (
                        <span key={tag} className="badge badge-accent">{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Snippet */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <div className={styles.aboutSnippet}>
            <div className={styles.aboutAvatar}>
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="22" r="12" fill="currentColor" opacity="0.9"/>
                <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="currentColor" opacity="0.9"/>
                <path d="M50 10l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="var(--color-accent, #f59e0b)" opacity="0.95"/>
                <path d="M56 20l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="var(--color-accent, #f59e0b)" opacity="0.7"/>
              </svg>
            </div>
            <div className={styles.aboutContent}>
              <h2 className="section-title">{t('home.about_title')}</h2>
              <p className={styles.aboutText}>{t('home.about_desc')}</p>
              <Link href="/about" className="btn btn-outline">
                {t('home.view_all')} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
