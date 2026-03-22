'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Share2, Play } from 'lucide-react';
import styles from './sharing.module.css';

interface SharedProject {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  content: string;
  html_code: string;
  embed_type: string;
  created_at: string;
}

export default function SharingPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<SharedProject[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('shared_projects')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <h1 className="section-title">{t('sharing.title')}</h1>
          <p className="section-subtitle">{t('sharing.subtitle')}</p>

          {items.length === 0 ? (
            <div className={styles.empty}>
              <Share2 size={48} />
              <p>{t('sharing.no_items')}</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className={styles.card}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (item.embed_type === 'html') {
                      window.open(`/app/${item.id}`, '_blank');
                    } else if (item.link_url) {
                      window.open(item.link_url, '_blank');
                    }
                  }}
                >
                  <div className={styles.cardImage}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        {item.embed_type === 'html' ? <Play size={28} /> : <Share2 size={28} />}
                      </div>
                    )}
                    {item.embed_type === 'html' && (
                      <div className={styles.htmlBadge}>內嵌應用</div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <p className={styles.cardDesc}>{item.description}</p>
                    <p className={styles.cardDate}>{item.created_at?.slice(0, 10)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
