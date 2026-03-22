'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ThumbsUp, Zap, ExternalLink, Calendar, Tag } from 'lucide-react';
import CommentSection from '@/components/CommentSection';
import styles from '../community.module.css';

interface ForumPost {
  id: string;
  type: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  link_url: string;
  image_url: string;
  user_name: string;
  vote_count: number;
  status: string;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  announcement: '📢 公告',
  wishlist: '✨ 許願池',
  discussion: '💬 交流討論',
};

export default function CommunityPostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null | undefined>(undefined);
  const [hasFreeVotedHere, setHasFreeVotedHere] = useState(false);
  const [myBoostCountHere, setMyBoostCountHere] = useState(0);
  const [voting, setVoting] = useState<'free' | 'boost' | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setPost(data ?? null));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    supabase
      .from('forum_votes')
      .select('post_id, vote_type')
      .eq('user_id', user.id)
      .eq('post_id', id)
      .then(({ data }) => {
        const records = data ?? [];
        setHasFreeVotedHere(records.some((r: { vote_type: string }) => r.vote_type === 'free'));
        setMyBoostCountHere(records.filter((r: { vote_type: string }) => r.vote_type === 'boost').length);
      });
  }, [user, id]);

  const handleFreeVote = async () => {
    if (!user) { alert('請先登入才能投票'); return; }
    if (hasFreeVotedHere) { alert('已投過此提案的免費票'); return; }
    setVoting('free');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('vote_for_post', { p_post_id: id, p_vote_type: 'free' });
    setVoting(null);
    if (error || !data?.success) { alert(data?.error ?? error?.message ?? '投票失敗'); return; }
    setHasFreeVotedHere(true);
    setPost(p => p ? { ...p, vote_count: p.vote_count + 1 } : p);
  };

  const handleBoost = async () => {
    if (!user) { alert('請先登入才能加購'); return; }
    if (myBoostCountHere >= 2) { alert('此提案加購已達上限（最多 2 次）'); return; }
    setVoting('boost');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('vote_for_post', { p_post_id: id, p_vote_type: 'boost' });
    setVoting(null);
    if (error || !data?.success) { alert(data?.error ?? error?.message ?? '加購失敗'); return; }
    setMyBoostCountHere(n => n + 1);
    setPost(p => p ? { ...p, vote_count: p.vote_count + 2 } : p);
  };

  if (post === undefined) return null;

  if (!post) {
    return (
      <div className="container section" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>找不到此篇文章</p>
        <Link href="/community" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
          回到討論區
        </Link>
      </div>
    );
  }

  const boostsLeft = 2 - myBoostCountHere;

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section">
          <Link href="/community" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: 'var(--space-6)', fontSize: 14 }}>
            <ArrowLeft size={16} /> 回到討論區
          </Link>

          {/* Post Header */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-5)',
          }}>
            {/* Type + Category badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ fontSize: 12 }}>
                {TYPE_LABEL[post.type] ?? post.type}
              </span>
              {post.category && (
                <span className="badge badge-accent" style={{ fontSize: 12 }}>{post.category}</span>
              )}
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.4, marginBottom: 'var(--space-4)' }}>
              {post.title}
            </h1>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div className={styles.avatar}>{post.user_name?.[0]?.toUpperCase() ?? '?'}</div>
                {post.user_name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} />
                {post.created_at?.slice(0, 10)}
              </span>
              {post.type === 'wishlist' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-primary)', fontWeight: 600 }}>
                  <ThumbsUp size={13} />
                  {post.vote_count} 票
                </span>
              )}
            </div>

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                {post.tags.map(tag => (
                  <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 4, padding: '2px 8px' }}>
                    <Tag size={10} />#{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Vote buttons (wishlist only) */}
            {post.type === 'wishlist' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
                {/* Free vote */}
                <button
                  className={`${styles.voteBtn} ${hasFreeVotedHere ? styles.voted : ''}`}
                  style={{ flexDirection: 'row', gap: 8, padding: '8px 18px', fontSize: 14 }}
                  onClick={handleFreeVote}
                  disabled={!!voting || hasFreeVotedHere}
                  title={hasFreeVotedHere ? '已投過此提案的免費票' : '免費投票 (+1)'}
                >
                  <ThumbsUp size={15} />
                  {hasFreeVotedHere ? '✓ 已投免費票' : voting === 'free' ? '投票中...' : '免費投票 (+1)'}
                </button>
                {/* Boost */}
                <button
                  className={`${styles.voteBtn} ${myBoostCountHere > 0 ? styles.voted : ''}`}
                  style={{ flexDirection: 'row', gap: 8, padding: '8px 18px', fontSize: 14 }}
                  onClick={handleBoost}
                  disabled={!!voting || boostsLeft <= 0}
                  title={boostsLeft <= 0 ? '已達加購上限' : `加購 +2票，消耗 100 積分（剩餘 ${boostsLeft} 次）`}
                >
                  <Zap size={15} />
                  {voting === 'boost' ? '加購中...' : `加購 +2票（100積分）剩 ${boostsLeft} 次`}
                  {myBoostCountHere > 0 && <span style={{ marginLeft: 4, opacity: 0.8 }}>×{myBoostCountHere}</span>}
                </button>
                {!user && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>請先登入才能投票</span>}
              </div>
            )}

            {/* Link */}
            {post.link_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}
              >
                <ExternalLink size={13} /> {post.link_url}
              </a>
            )}
          </div>

          {/* Content */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-5)',
            lineHeight: 1.8,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              📄 文章內容
            </h3>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Image */}
          {post.image_url && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <img src={post.image_url} alt={post.title} style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--color-border)' }} />
            </div>
          )}

          {/* Comments */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 'var(--space-6)',
          }}>
            <CommentSection contentType="forum" contentId={post.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
