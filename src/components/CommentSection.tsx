'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { MessageCircle, Send, LogIn } from 'lucide-react';

interface Comment {
  id: string;
  user_name: string;
  body: string;
  created_at: string;
}

interface Props {
  contentType: 'project' | 'prompt' | 'skill' | 'forum';
  contentId: string;
}

export default function CommentSection({ contentType, contentId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [moderation, setModeration] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const userName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    '匿名';

  const loadComments = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('comments')
      .select('id, user_name, body, created_at')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    setComments(data ?? []);
  }, [contentType, contentId]);

  useEffect(() => {
    loadComments();
    const supabase = getSupabaseClient();
    supabase
      .from('site_settings')
      .select('comment_moderation')
      .eq('id', 1)
      .single()
      .then(({ data }) => setModeration(data?.comment_moderation ?? false));
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!body.trim() || !user) return;
    setSubmitting(true);
    const supabase = getSupabaseClient();
    const status = moderation ? 'pending' : 'approved';
    const { error } = await supabase.from('comments').insert({
      content_type: contentType,
      content_id: contentId,
      user_id: user.id,
      user_name: userName,
      user_email: user.email,
      body: body.trim(),
      status,
    });
    setSubmitting(false);
    if (error) { alert(`送出失敗：${error.message}`); return; }
    setBody('');
    setSubmitted(true);
    if (!moderation) loadComments();
    setTimeout(() => setSubmitted(false), 4000);
  };

  const handleLogin = () => {
    getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-6)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)' }}>
        <MessageCircle size={20} />
        留言討論 ({comments.length})
      </h3>

      {/* Input area */}
      {user ? (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>使用心得與建議</p>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 1000))}
            placeholder="分享你的使用心得與建議..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{body.length}/1000</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
            >
              <Send size={14} style={{ marginRight: 4 }} />
              提交評論
            </button>
          </div>
          {submitted && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-success, #22c55e)' }}>
              {moderation ? '✅ 留言已送出，等待管理員審核後顯示。' : '✅ 留言已送出！'}
            </p>
          )}
        </div>
      ) : (
        <div style={{
          padding: 'var(--space-6)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          textAlign: 'center',
          marginBottom: 'var(--space-6)',
          background: 'var(--color-surface)',
        }}>
          <p style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)' }}>登入後即可參與討論</p>
          <button className="btn btn-primary" onClick={handleLogin}>
            <LogIn size={16} style={{ marginRight: 6 }} />
            登入
          </button>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14, padding: 'var(--space-4) 0' }}>
          還沒有人留言，成為第一個留言的人吧！
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {comments.map(comment => (
            <div key={comment.id} style={{
              padding: 'var(--space-4)',
              background: 'var(--color-surface)',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{comment.user_name}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {comment.created_at?.slice(0, 10)}
                </span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{comment.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
