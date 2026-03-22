'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link href="/privacy" className={styles.link}>
            {t('footer.privacy')}
          </Link>
        </div>
        <div className={styles.right}>
          <span className={styles.madeWith}>
            {t('footer.copyright')}{' '}
            <a
              href="https://huobest.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.brandLink}
            >
              {t('footer.brand')}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
