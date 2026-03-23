'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function PrivacyPage() {
  const { t } = useI18n();
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('privacy_policy')
      .select('content')
      .eq('id', 1)
      .single()
      .then(({ data }) => setContent(data?.content ?? ''));
  }, []);

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <h1 className="section-title">{t('privacy.title')}</h1>
          <p className="section-subtitle">{t('privacy.subtitle')}</p>

          <div className="markdown-content" style={{ maxWidth: 800 }}>
            {content === null ? null : content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p style={{ color: 'var(--color-text-tertiary)' }}>（尚未設定隱私政策內容）</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
