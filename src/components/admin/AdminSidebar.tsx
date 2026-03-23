'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

const navItems = [
  { href: '/admin/dashboard', icon: '📊', label: '儀表板' },
  { href: '/admin/projects', icon: '🗂', label: '作品介紹管理' },
  { href: '/admin/prompts', icon: '💬', label: '提示詞管理' },
  { href: '/admin/skills', icon: '🧠', label: 'Skill 管理' },
  { href: '/admin/workshops', icon: '📅', label: '工作坊管理' },
  { href: '/admin/sharing', icon: '🤝', label: '社群分享管理' },
  { href: '/admin/categories', icon: '🏷️', label: '分類管理' },
  { href: '/admin/about', icon: '👤', label: '關於我編輯' },
  { href: '/admin/privacy', icon: '🔒', label: '隱私政策編輯' },
  { href: '/admin/settings', icon: '⚙️', label: '網站設定' },
  { href: '/admin/members', icon: '👥', label: '會員管理' },
  { href: '/admin/backup', icon: '💾', label: '備份與還原' },
  { href: '/admin/feedback', icon: '📩', label: '回報問題管理' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <h2>霍 の AI 腦洞實驗室</h2>
        <span>管理後台</span>
      </div>
      <nav className={styles.sidebarNav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href || pathname.startsWith(item.href + '/') ? styles.active : ''}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        © 2026 霍家私塾
      </div>
    </aside>
  );
}
