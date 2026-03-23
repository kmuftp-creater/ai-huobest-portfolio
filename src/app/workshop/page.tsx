'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Calendar, BookOpen } from 'lucide-react';
import styles from './workshop.module.css';

interface Workshop {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  created_at: string;
  link_url: string;
  embed_type: string;
  tags: string[];
}

export default function WorkshopPage() {
  const { t } = useI18n();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('workshops')
      .select('id, title, description, thumbnail_url, published_at, created_at, link_url, embed_type')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => setWorkshops((data ?? []).map((d: Record<string, unknown>) => ({ ...d, tags: (d.tags as string[]) ?? [] }) as Workshop)));
  }, []);

  const displayDate = (ws: Workshop) =>
    ws.published_at ? ws.published_at.slice(0, 10) : null;

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <h1 className="section-title">{t('workshop.title')}</h1>
          <p className="section-subtitle" style={{ marginBottom: 4 }}>{t('workshop.subtitle')}</p>
          <p className="section-subtitle" style={{ marginTop: 0 }}>{t('workshop.subtitle2')}</p>

          {workshops.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={48} />
              <p>{t('workshop.no_workshops')}</p>
            </div>
          ) : (
            <div className={styles.list}>
              {workshops.map(ws => (
                <Link key={ws.id} href={`/workshop/${ws.id}`} className={styles.card}>
                  <div className={styles.cardImage}>
                    {ws.thumbnail_url ? (
                      <img src={ws.thumbnail_url} alt={ws.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <BookOpen size={40} />
                      </div>
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    {displayDate(ws) && (
                      <div className={styles.cardDate}>
                        <Calendar size={14} />
                        <span>{displayDate(ws)}</span>
                      </div>
                    )}
                    <h3 className={styles.cardTitle}>{ws.title}</h3>
                    {ws.description && <p className={styles.cardDesc}>{ws.description}</p>}
                    {ws.tags?.length > 0 && (
                      <div className={styles.cardTags}>
                        {ws.tags.map(tag => <span key={tag} className={styles.cardTag}>{tag}</span>)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
