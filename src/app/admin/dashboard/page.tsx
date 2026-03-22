'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

interface Stats {
  projects: number;
  prompts_published: number;
  prompts_pending: number;
  skills: number;
  workshops: number;
  members: number;
}

export default function AdminDashboard() {
  const supabase = getSupabaseClient();
  const [stats, setStats] = useState<Stats>({ projects: 0, prompts_published: 0, prompts_pending: 0, skills: 0, workshops: 0, members: 0 });
  const [email, setEmail] = useState('');

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');

    const [p, pp, pe, s, w] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('skills').select('id', { count: 'exact', head: true }),
      supabase.from('workshops').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      projects: p.count ?? 0,
      prompts_published: pp.count ?? 0,
      prompts_pending: pe.count ?? 0,
      skills: s.count ?? 0,
      workshops: w.count ?? 0,
      members: 0,
    });
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const statCards = [
    { label: '專案', number: stats.projects, icon: '🗂' },
    { label: '提示詞（已發布）', number: stats.prompts_published, icon: '✅' },
    { label: '提示詞（待審核）', number: stats.prompts_pending, icon: '⏳' },
    { label: 'Skill', number: stats.skills, icon: '🧠' },
    { label: '工作坊', number: stats.workshops, icon: '📅' },
  ];

  return (
    <AdminShell pageTitle="儀表板" userEmail={email}>
      <div className={styles.statsGrid}>
        {statCards.map((c) => (
          <div key={c.label} className={styles.statCard}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div className={styles.statNumber}>{c.number}</div>
            <div className={styles.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
        歡迎回來，{email}！請使用左側選單管理網站內容。
      </p>
    </AdminShell>
  );
}
