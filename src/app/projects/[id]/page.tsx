'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { ArrowLeft, ExternalLink, Github, Calendar, Brain } from 'lucide-react';
import styles from './detail.module.css';
import CommentSection from '@/components/CommentSection';

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
}

export default function ProjectDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => setProject(data ?? null));
  }, [params.id]);

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
                  remarkPlugins={[remarkGfm]}
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
                  <Github size={16} /> {t('projects.source')}
                </a>
              )}
            </div>

            <CommentSection contentType="project" contentId={project.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
