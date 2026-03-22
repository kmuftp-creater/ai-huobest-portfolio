'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AdminShell from '@/components/admin/AdminShell';
import styles from '@/app/admin/admin.module.css';

interface Profile {
  id: string;
  email: string;
  username: string;
  phone: string;
  gender: string;
  birthday: string;
  points: number;
  level: string;
  created_at: string;
  updated_at: string;
}

const LEVEL_OPTIONS = [
  { value: 'normal',     label: '一般會員', color: '#6b7280' },
  { value: 'sponsor',    label: '贊助會員', color: '#f59e0b' },
  { value: 'subscriber', label: '訂閱會員', color: '#8b5cf6' },
];

function LevelBadge({ level }: { level: string }) {
  const opt = LEVEL_OPTIONS.find(o => o.value === level) ?? LEVEL_OPTIONS[0];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, color: '#fff',
      background: opt.color,
    }}>{opt.label}</span>
  );
}

export default function AdminMembersPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingLevel, setEditingLevel] = useState<string | null>(null); // member id being edited
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setMembers(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const handleLevelChange = async (memberId: string, newLevel: string) => {
    setSaving(memberId);
    const { error } = await supabase
      .from('profiles')
      .update({ level: newLevel, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, level: newLevel } : m));
      if (selectedMember?.id === memberId) setSelectedMember(prev => prev ? { ...prev, level: newLevel } : prev);
    }
    setSaving(null);
    setEditingLevel(null);
  };

  const handleResetPassword = async (email: string) => {
    setResetSending(true);
    setResetMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    setResetSending(false);
    setResetMsg(error ? `發送失敗：${error.message}` : `已發送重設密碼信件至 ${email}`);
    setTimeout(() => setResetMsg(''), 5000);
  };

  const filtered = members.filter(m =>
    (m.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (m.username ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell pageTitle="會員管理" userEmail={user?.email}>
      <div className={styles.pageHeader}>
        <h2>會員列表 <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)' }}>({members.length} 人)</span></h2>
        <input
          type="text"
          placeholder="搜尋 Email 或名稱..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'inherit', fontSize: 13, width: 220 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedMember ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>名稱</th>
                <th>Email</th>
                <th>積分</th>
                <th>會員等級</th>
                <th>加入時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>載入中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>無符合資料</td></tr>
              ) : filtered.map(m => (
                <tr
                  key={m.id}
                  style={{ cursor: 'pointer', background: selectedMember?.id === m.id ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : undefined }}
                  onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                >
                  <td>{m.username || '—'}</td>
                  <td style={{ fontSize: 13 }}>{m.email}</td>
                  <td style={{ fontWeight: 600 }}>{(m.points ?? 0).toLocaleString()}</td>
                  <td>
                    {editingLevel === m.id ? (
                      <select
                        autoFocus
                        defaultValue={m.level || 'normal'}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleLevelChange(m.id, e.target.value)}
                        onBlur={() => setEditingLevel(null)}
                        disabled={saving === m.id}
                        style={{ fontSize: 12, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'inherit' }}
                      >
                        {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span onClick={e => { e.stopPropagation(); setEditingLevel(m.id); }}>
                        <LevelBadge level={m.level || 'normal'} />
                        <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--color-text-tertiary)' }}>✏️</span>
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{m.created_at?.slice(0, 10)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                      >
                        詳情
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedMember && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px', background: 'var(--color-surface)', fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontSize: 16 }}>會員詳情</strong>
              <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>名稱</span><br /><strong>{selectedMember.username || '—'}</strong></div>
              <div><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>Email</span><br /><span style={{ wordBreak: 'break-all' }}>{selectedMember.email}</span></div>
              <div><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>電話</span><br />{selectedMember.phone || '—'}</div>
              <div><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>性別</span><br />{selectedMember.gender || '—'}</div>
              <div><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>生日</span><br />{selectedMember.birthday ? selectedMember.birthday.slice(0, 10) : '—'}</div>
              <div><span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>積分</span><br /><strong style={{ fontSize: 18 }}>{(selectedMember.points ?? 0).toLocaleString()}</strong></div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>會員等級</span><br />
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEVEL_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => handleLevelChange(selectedMember.id, o.value)}
                      disabled={saving === selectedMember.id}
                      style={{
                        padding: '4px 12px', borderRadius: 20, border: '2px solid ' + o.color,
                        background: (selectedMember.level || 'normal') === o.value ? o.color : 'transparent',
                        color: (selectedMember.level || 'normal') === o.value ? '#fff' : o.color,
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {saving === selectedMember.id ? '...' : o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
                <button
                  onClick={() => handleResetPassword(selectedMember.email)}
                  disabled={resetSending}
                  className={styles.editBtn}
                  style={{ width: '100%' }}
                >
                  {resetSending ? '發送中...' : '發送重設密碼信件'}
                </button>
                {resetMsg && <p style={{ fontSize: 12, marginTop: 8, color: resetMsg.includes('失敗') ? '#ef4444' : '#10b981' }}>{resetMsg}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
