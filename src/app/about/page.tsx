'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { getSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './about.module.css';

export default function AboutPage() {
  const { t } = useI18n();
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('about_me')
      .select('content')
      .eq('id', 1)
      .single()
      .then(({ data }) => setContent(data?.content ?? ''));
  }, []);

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <div className={styles.header}>
            <div className={styles.avatar}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Head */}
                <circle cx="32" cy="22" r="12" fill="currentColor" opacity="0.9"/>
                {/* Body */}
                <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="currentColor" opacity="0.9"/>
                {/* Sparkle */}
                <path d="M50 10l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="var(--color-accent, #f59e0b)" opacity="0.95"/>
                <path d="M56 20l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="var(--color-accent, #f59e0b)" opacity="0.7"/>
              </svg>
            </div>
            <h1 className="section-title">{t('about.title')}</h1>
            <p className="section-subtitle">{t('about.subtitle')}</p>
          </div>

          <div className={styles.content}>
            {content === null ? null : content ? (
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <>
                <div className={styles.block}>
                  <h2 className={styles.blockTitle}>👋 自我介紹</h2>
                  <p className={styles.text}>
                    嗨，我是一位熱愛 AI 技術的開發者，致力於探索人工智慧的各種應用可能性。
                    從最初對程式設計的好奇，到現在深入研究人工智慧，我一直相信科技可以讓世界變得更好。
                  </p>
                </div>

                <div className={styles.block}>
                  <h2 className={styles.blockTitle}>🛠 技術專長</h2>
                  <div className={styles.skillGrid}>
                    {['React', 'Next.js', 'TypeScript', 'Python', 'Node.js', 'OpenAI API', 'Supabase', 'TensorFlow'].map(s => (
                      <span key={s} className={styles.skillItem}>{s}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.block}>
                  <h2 className={styles.blockTitle}>🎯 目前專注</h2>
                  <ul className={styles.focusList}>
                    <li>AI 應用開發與提示詞工程</li>
                    <li>全端網頁開發 (React/Next.js)</li>
                    <li>機器學習模型部署與優化</li>
                    <li>開源專案貢獻與技術分享</li>
                  </ul>
                </div>

                <div className={styles.block}>
                  <h2 className={styles.blockTitle}>📫 聯繫方式</h2>
                  <div className={styles.contactLinks}>
                    <a href="https://github.com/kmuftp" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                      GitHub: kmuftp
                    </a>
                    <a href="https://huobest.com" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                      Website: huobest.com
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
