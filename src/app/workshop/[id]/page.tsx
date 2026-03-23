'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Calendar, ArrowLeft, ExternalLink } from 'lucide-react';
import styles from './workshop-detail.module.css';

interface Workshop {
  id: string;
  title: string;
  description: string;
  content: string;
  thumbnail_url: string;
  published_at: string;
  created_at: string;
  link_url: string;
  embed_type: string;
  tags: string[];
}

export default function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('workshops')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) { router.replace('/workshop'); return; }
        setWorkshop(data);
        setLoading(false);
      });
  }, [id, router]);

  if (loading) return (
    <div className="page-enter">
      <div className="container">
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>載入中...</div>
      </div>
    </div>
  );

  if (!workshop) return null;

  const displayDate = (ws: Workshop) => ws.published_at ? ws.published_at.slice(0, 10) : null;

  return (
    <div className="page-enter">
      <div className="container">
        <div className={styles.wrapper}>
          <Link href="/workshop" className={styles.backLink}>
            <ArrowLeft size={16} /> 返回工作坊列表
          </Link>

          {workshop.thumbnail_url && (
            <div className={styles.cover}>
              <img src={workshop.thumbnail_url} alt={workshop.title} />
            </div>
          )}

          <div className={styles.header}>
            {displayDate(workshop) && (
              <div className={styles.meta}>
                <Calendar size={14} />
                <span>{displayDate(workshop)}</span>
              </div>
            )}
            <h1 className={styles.title}>{workshop.title}</h1>
            {workshop.description && (
              <p className={styles.description}>{workshop.description}</p>
            )}
            {workshop.tags?.length > 0 && (
              <div className={styles.tags}>
                {workshop.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          {workshop.content && (
            <div className={styles.content}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                {workshop.content}
              </ReactMarkdown>
            </div>
          )}

          {workshop.link_url && (
            <div className={styles.cta}>
              <a href={workshop.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <ExternalLink size={16} />
                立即報名
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
