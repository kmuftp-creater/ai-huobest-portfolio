import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理後台 — 霍 の AI 腦洞實驗室',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth guard is handled by middleware.ts
  // This layout renders children (AdminShell is included in each page)
  return <>{children}</>;
}
