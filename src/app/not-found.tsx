'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { Home } from 'lucide-react';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="page-enter" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: 'var(--space-8)',
    }}>
      <div style={{ fontSize: '80px', marginBottom: 'var(--space-4)' }}>🚀</div>
      <h1 style={{
        fontSize: 'var(--text-display)',
        fontWeight: 'var(--weight-bold)',
        marginBottom: 'var(--space-3)',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        {t('not_found.title')}
      </h1>
      <p style={{
        fontSize: 'var(--text-body)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-8)',
        maxWidth: '400px',
      }}>
        {t('not_found.description')}
      </p>
      <Link href="/" className="btn btn-primary btn-lg">
        <Home size={18} />
        {t('not_found.go_home')}
      </Link>
    </div>
  );
}
