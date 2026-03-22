'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from '@/app/admin/admin.module.css';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'your-admin@example.com';

interface AdminShellProps {
  children: React.ReactNode;
  pageTitle: string;
  userEmail?: string;
}

export default function AdminShell({ children, pageTitle, userEmail }: AdminShellProps) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;
    const email = user?.email;
    if (email === ADMIN_EMAIL) {
      setAllowed(true);
    } else {
      router.replace('/admin/login');
    }
    setChecked(true);
  }, [loading, user, router]);

  if (!checked) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>驗證中...</p>
    </div>
  );

  if (!allowed) return null;

  const handleLogout = async () => {
    await signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.mainContent}>
        <header className={styles.adminHeader}>
          <h1>{pageTitle}</h1>
          <div className={styles.headerActions}>
            {userEmail && <span className={styles.userEmail}>{userEmail}</span>}
            <button className={styles.logoutBtn} onClick={handleLogout}>
              登出
            </button>
          </div>
        </header>
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
