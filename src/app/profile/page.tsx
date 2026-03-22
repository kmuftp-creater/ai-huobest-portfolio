'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { User, Mail, Phone, Calendar, Star, FileText, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './profile.module.css';

interface Profile {
  id: string;
  email: string;
  username: string;
  phone: string;
  gender: string;
  birthday: string;
  notes: string;
  points: number;
  level: string;
}

interface PointsLog {
  id: string;
  action: string;
  points: number;
  created_at: string;
}

const MEMBER_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  normal:     { label: '一般會員', color: '#6b7280', desc: '基本會員資格' },
  sponsor:    { label: '贊助會員', color: '#f59e0b', desc: '感謝您的贊助支持' },
  subscriber: { label: '訂閱會員', color: '#8b5cf6', desc: '享有訂閱專屬內容' },
};

function getMemberInfo(level: string) {
  return MEMBER_CONFIG[level] ?? MEMBER_CONFIG.normal;
}

function groupByDate(logs: PointsLog[]) {
  const map: Record<string, PointsLog[]> = {};
  logs.forEach(l => {
    const date = l.created_at.slice(0, 10);
    if (!map[date]) map[date] = [];
    map[date].push(l);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = getSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<PointsLog[]>([]);
  const [form, setForm] = useState({ username: '', phone: '', gender: '', birthday: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showLogs, setShowLogs] = useState(true);
  const [resetSent, setResetSent] = useState(false);

  // Redirect to home when logged out
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    (async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (prof) {
        setProfile(prof);
        setForm({
          username: prof.username ?? '',
          phone: prof.phone ?? '',
          gender: prof.gender ?? '',
          birthday: prof.birthday ? prof.birthday.slice(0, 10) : '',
          notes: prof.notes ?? '',
        });
      } else {
        const email = user.email ?? '';
        const username = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split('@')[0];
        await supabase.from('profiles').insert({ id: uid, email, username, points: 200, level: 'normal' });
        await supabase.from('points_log').insert({ user_id: uid, action: '新會員註冊', points: 200 });
        const { data: newProf } = await supabase.from('profiles').select('*').eq('id', uid).single();
        if (newProf) {
          setProfile(newProf);
          setForm({ username: newProf.username ?? '', phone: '', gender: '', birthday: '', notes: '' });
        }
      }

      const { data: logData } = await supabase
        .from('points_log')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(logData ?? []);
    })();
  }, [user, supabase]);

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      username: form.username,
      phone: form.phone,
      gender: form.gender,
      birthday: form.birthday || null,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    setSaving(false);
    if (error) { setSaveMsg('儲存失敗：' + error.message); return; }
    setProfile(prev => prev ? { ...prev, ...form } : prev);
    setSaveMsg('已儲存成功 ✓');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    setResetSent(true);
  };

  if (loading || !profile) return (
    <div className="page-enter"><div className="container">
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>載入中...</div>
    </div></div>
  );

  const memberInfo = getMemberInfo(profile.level);
  const grouped = groupByDate(logs);

  return (
    <div className="page-enter">
      <div className="container">
        <div className={styles.wrapper}>
          <h1 className={styles.pageTitle}>會員中心</h1>

          <div className={styles.grid}>
            {/* Left: Profile Form */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <User size={18} />
                <span>個人資料</span>
              </div>

              {/* Member Badge */}
              <div className={styles.levelBadge} style={{ borderColor: memberInfo.color }}>
                <Star size={14} style={{ color: memberInfo.color }} />
                <span style={{ color: memberInfo.color }}>{memberInfo.label}</span>
                <span className={styles.pointsDisplay}>{profile.points.toLocaleString()} 積分</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
                {memberInfo.desc}
              </p>

              <form onSubmit={handleSave} className={styles.form}>
                <div className={styles.field}>
                  <label><Mail size={13} /> Email</label>
                  <input type="text" value={profile.email ?? ''} disabled className={styles.disabled} />
                </div>

                <div className={styles.field}>
                  <label><User size={13} /> 使用者名稱</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label><Phone size={13} /> 電話號碼</label>
                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0912345678" />
                  </div>
                  <div className={styles.field}>
                    <label>性別</label>
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">不填寫</option>
                      <option value="男性">男性</option>
                      <option value="女性">女性</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label><Calendar size={13} /> 生日</label>
                  <input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
                </div>

                <div className={styles.field}>
                  <label><FileText size={13} /> 備註</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="自我介紹或備註..." />
                </div>

                {saveMsg && <p className={styles.saveMsg}>{saveMsg}</p>}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '儲存中...' : '確認變更'}
                </button>
              </form>

              <div className={styles.divider} />

              <div className={styles.passwordSection}>
                <Lock size={14} />
                <span>重設密碼</span>
                {resetSent ? (
                  <span className={styles.resetOk}>已發送重設信件，請檢查信箱</span>
                ) : (
                  <button className={styles.resetBtn} onClick={handleResetPassword}>
                    發送重設密碼信件
                  </button>
                )}
              </div>
            </div>

            {/* Right: Points Log */}
            <div className={styles.card}>
              <button className={styles.cardHeader} onClick={() => setShowLogs(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <Star size={18} />
                <span>積分紀錄</span>
                {showLogs ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
              </button>

              {showLogs && (
                logs.length === 0 ? (
                  <p style={{ color: 'var(--color-text-tertiary)', padding: '1rem 0', fontSize: 14 }}>尚無積分紀錄</p>
                ) : (
                  <div className={styles.logList}>
                    {grouped.map(([date, entries]) => (
                      <div key={date} className={styles.logGroup}>
                        <div className={styles.logDate}>{date}</div>
                        {entries.map(e => (
                          <div key={e.id} className={styles.logRow}>
                            <span className={styles.logAction}>{e.action}</span>
                            <span className={e.points >= 0 ? styles.logPlus : styles.logMinus}>
                              {e.points >= 0 ? '+' : ''}{e.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
