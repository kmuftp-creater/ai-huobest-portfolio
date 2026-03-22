'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Search, Plus, ThumbsUp, Zap, MessageCircle, Megaphone, Lightbulb, Users, X } from 'lucide-react';
import styles from './community.module.css';

type TabType = 'discussion' | 'wishlist' | 'announcement';

interface ForumPost {
  id: string;
  type: TabType;
  title: string;
  content: string;
  category: string;
  tags: string[];
  link_url: string;
  image_url: string;
  user_id: string;
  user_name: string;
  vote_count: number;
  view_count: number;
  status: string;
  created_at: string;
}

interface VoteRecord {
  post_id: string;
  vote_type: 'free' | 'boost';
}

const PAGE_SIZE = 10;

function CommunityContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = searchParams.get('tab');
    return (t === 'wishlist' || t === 'announcement') ? t : 'discussion';
  });
  const [posts, setPosts] = useState<ForumPost[]>([]);

  // Vote state: per-post (each post independently supports 1 free vote + up to 2 boosts per user)
  const [myFreeVotedPostIds, setMyFreeVotedPostIds] = useState<Set<string>>(new Set());
  const [myBoostsByPost, setMyBoostsByPost] = useState<Record<string, number>>({});

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ discussion: 0, wishlist: 0, announcement: 0 });

  // New post modal
  const [showModal, setShowModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: '', tagsRaw: '', link_url: '', image_url: '' });
  const setField = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Image upload for new post
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);

  // Vote loading
  const [voting, setVoting] = useState<string | null>(null); // 'free-{postId}' or 'boost-{postId}'

  const userName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? '匿名';

  const loadPosts = async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    const all = data ?? [];
    setPosts(all);
    setStats({
      discussion: all.filter(p => p.type === 'discussion').length,
      wishlist: all.filter(p => p.type === 'wishlist').length,
      announcement: all.filter(p => p.type === 'announcement').length,
    });
  };

  const loadMyVotes = async () => {
    if (!user) {
      setMyFreeVotedPostIds(new Set());
      setMyBoostsByPost({});
      return;
    }
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('forum_votes')
      .select('post_id, vote_type')
      .eq('user_id', user.id);
    const records: VoteRecord[] = data ?? [];
    const freePostIds = new Set(records.filter(r => r.vote_type === 'free').map(r => r.post_id));
    const boostMap: Record<string, number> = {};
    records.filter(r => r.vote_type === 'boost').forEach(r => {
      boostMap[r.post_id] = (boostMap[r.post_id] ?? 0) + 1;
    });
    setMyFreeVotedPostIds(freePostIds);
    setMyBoostsByPost(boostMap);
  };

  const handleImgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const supabase = getSupabaseClient();
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('assets').upload(`community/${fileName}`, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(`community/${fileName}`);
      setField('image_url', publicUrl);
    } catch (err: unknown) {
      alert(`圖片上傳失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImgUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  const loadCategories = async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('categories')
      .select('name')
      .eq('type', 'forum')
      .order('name');
    setCategories((data ?? []).map((c: { name: string }) => c.name));
  };

  useEffect(() => { loadPosts(); loadCategories(); }, []);
  useEffect(() => { loadMyVotes(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    setPage(1);
    let list = posts.filter(p => p.type === activeTab);
    if (search) list = list.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content?.toLowerCase().includes(search.toLowerCase())
    );
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter);
    if (sort === 'votes') list = [...list].sort((a, b) => b.vote_count - a.vote_count);
    else if (sort === 'oldest') list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return list;
  }, [posts, activeTab, search, categoryFilter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Free vote: 1 per post per user, +1 to post
  const handleFreeVote = async (postId: string) => {
    if (!user) { alert('請先登入才能投票'); return; }
    if (myFreeVotedPostIds.has(postId)) { alert('已投過此提案的免費票'); return; }
    setVoting(`free-${postId}`);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('vote_for_post', { p_post_id: postId, p_vote_type: 'free' });
    setVoting(null);
    if (error || !data?.success) { alert(data?.error ?? error?.message ?? '投票失敗'); return; }
    await loadMyVotes();
    await loadPosts();
  };

  // Boost: 100 pts, +2 to post, max 2 boosts per post per user
  const handleBoost = async (postId: string) => {
    if (!user) { alert('請先登入才能加購'); return; }
    const boostsOnThisPost = myBoostsByPost[postId] ?? 0;
    if (boostsOnThisPost >= 2) { alert('此提案加購已達上限（最多 2 次）'); return; }
    setVoting(`boost-${postId}`);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('vote_for_post', { p_post_id: postId, p_vote_type: 'boost' });
    setVoting(null);
    if (error || !data?.success) { alert(data?.error ?? error?.message ?? '加購失敗'); return; }
    await loadMyVotes();
    await loadPosts();
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim() || !form.content.trim()) return;
    setPosting(true);
    const supabase = getSupabaseClient();
    const tags = form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);
    const { error } = await supabase.from('forum_posts').insert({
      type: activeTab === 'announcement' ? 'discussion' : activeTab,
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category.trim() || null,
      tags,
      link_url: form.link_url.trim() || null,
      image_url: form.image_url || null,
      user_id: user.id,
      user_name: userName,
      status: 'published',
    });
    setPosting(false);
    if (error) { alert(`發布失敗：${error.message}`); return; }
    setForm({ title: '', content: '', category: '', tagsRaw: '', link_url: '', image_url: '' });
    setShowModal(false);
    await loadPosts();
  };

  const tabConfig = [
    { key: 'discussion' as TabType, label: '交流討論', icon: <Users size={15} /> },
    { key: 'wishlist' as TabType, label: '許願池', icon: <Lightbulb size={15} /> },
    { key: 'announcement' as TabType, label: '公告', icon: <Megaphone size={15} /> },
  ];

  const canPost = !!user && activeTab !== 'announcement';

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 className="section-title" style={{ marginBottom: 4 }}>交流討論區</h1>
          <p className="section-subtitle">分享想法、提出需求、與社群一起成長</p>
        </div>

        {/* Stats */}
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.blue}`}>{stats.discussion}</div>
            <div className={styles.statLabel}>交流討論</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.orange}`}>{stats.wishlist}</div>
            <div className={styles.statLabel}>許願提案</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.green}`}>{stats.announcement}</div>
            <div className={styles.statLabel}>公告</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabConfig.map(t => (
            <button
              key={t.key}
              className={`${styles.tabBtn} ${activeTab === t.key ? styles.active : ''}`}
              onClick={() => { setActiveTab(t.key); setPage(1); setCategoryFilter(''); setSearch(''); }}
            >
              {t.icon}&nbsp;{t.label}
            </button>
          ))}
        </div>

        <div className={styles.mainLayout}>
          {/* Post List */}
          <div>
            {/* Controls */}
            <div className={styles.controls}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  placeholder="搜尋主題..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className={styles.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">最新發布</option>
                <option value="oldest">最早發布</option>
                {activeTab === 'wishlist' && <option value="votes">票數最多</option>}
              </select>
              {canPost && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                  <Plus size={15} style={{ marginRight: 4 }} />
                  {activeTab === 'wishlist' ? '提出需求' : '發起討論'}
                </button>
              )}
            </div>

            {/* Post list */}
            {paginated.length === 0 ? (
              <div className={styles.empty}>
                <MessageCircle size={48} />
                <p>
                  {activeTab === 'discussion' ? '還沒有討論，來發起第一篇吧！'
                    : activeTab === 'wishlist' ? '還沒有提案，許個願吧！'
                    : '目前沒有公告'}
                </p>
              </div>
            ) : activeTab === 'wishlist' ? (
              /* Wishlist layout */
              <div className={styles.postList}>
                {paginated.map(post => {
                  const isFreeVoting = voting === `free-${post.id}`;
                  const isBoosting = voting === `boost-${post.id}`;
                  const hasFreedVotedHere = myFreeVotedPostIds.has(post.id);
                  const boostsOnThisPost = myBoostsByPost[post.id] ?? 0;
                  const boostsLeft = 2 - boostsOnThisPost;
                  return (
                    <div key={post.id} className={styles.wishlistCard} style={{ position: 'relative' }}>
                      {/* Overlay link covers entire card except vote box */}
                      <Link href={`/community/${post.id}`} style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-label={post.title} />
                      <div className={styles.wishlistBody}>
                        {/* Vote box */}
                        <div className={styles.voteBox} style={{ position: 'relative', zIndex: 1 }}>
                          <span className={styles.voteCount}>{post.vote_count}</span>
                          <span className={styles.voteLabel}>票</span>
                          {/* Free vote */}
                          <button
                            className={`${styles.voteBtn} ${hasFreedVotedHere ? styles.voted : ''}`}
                            disabled={!!voting || hasFreedVotedHere}
                            onClick={() => handleFreeVote(post.id)}
                            title={hasFreedVotedHere ? '已在此提案投過免費票' : '免費投票 (+1)'}
                          >
                            <ThumbsUp size={14} />
                            {hasFreedVotedHere ? '✓' : isFreeVoting ? '…' : '免費'}
                          </button>
                          {/* Boost */}
                          <button
                            className={`${styles.voteBtn} ${boostsOnThisPost > 0 ? styles.voted : ''}`}
                            style={{ fontSize: 10 }}
                            disabled={!!voting || boostsLeft <= 0}
                            onClick={() => handleBoost(post.id)}
                            title={boostsLeft <= 0 ? '此提案加購已達上限' : `加購 +2票（消耗 100 積分）剩餘 ${boostsLeft} 次`}
                          >
                            <Zap size={13} />
                            {isBoosting ? '…' : `+2 (${boostsLeft}次)`}
                          </button>
                        </div>
                        {/* Content */}
                        <div className={styles.wishlistContent} style={{ position: 'relative', zIndex: 1 }}>
                          <div className={styles.postCardTop}>
                            {post.category && (
                              <span className="badge badge-accent" style={{ fontSize: 11 }}>{post.category}</span>
                            )}
                            {hasFreedVotedHere && <span className="badge badge-primary" style={{ fontSize: 10 }}>✓ 已投票</span>}
                            {boostsOnThisPost > 0 && <span className="badge badge-accent" style={{ fontSize: 10 }}>⚡ 已加購×{boostsOnThisPost}</span>}
                          </div>
                          <div className={styles.postTitle}>{post.title}</div>
                          <p className={styles.postExcerpt}>{post.content}</p>
                          <div className={styles.postMeta}>
                            <div className={styles.postAuthor}>
                              <div className={styles.avatar}>{post.user_name?.[0]?.toUpperCase() ?? '?'}</div>
                              <span>{post.user_name}</span>
                            </div>
                            <span>·</span>
                            <span>{post.created_at?.slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>
                      {user && (
                        <div className={styles.voteInfo} style={{ position: 'relative', zIndex: 1 }}>免費票 1 票 · 加購每次 100 積分 +2 票，每個提案最多加購 2 次</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Discussion / Announcement layout */
              <div className={styles.postList}>
                {paginated.map(post => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className={`${styles.postCard} ${post.type === 'announcement' ? styles.announcementCard : ''}`}
                  >
                    <div className={styles.postCardTop}>
                      {post.type === 'announcement' && (
                        <span className="badge badge-warning" style={{ fontSize: 11 }}>📢 公告</span>
                      )}
                      {post.category && (
                        <span className="badge badge-primary" style={{ fontSize: 11 }}>{post.category}</span>
                      )}
                    </div>
                    <div className={styles.postTitle}>{post.title}</div>
                    <p className={styles.postExcerpt}>{post.content?.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '')}</p>
                    {post.tags?.length > 0 && (
                      <div className={styles.tagRow}>
                        {post.tags.map(tag => <span key={tag} className={styles.tag}>#{tag}</span>)}
                      </div>
                    )}
                    <div className={styles.postMeta}>
                      <div className={styles.postAuthor}>
                        <div className={styles.avatar}>{post.user_name?.[0]?.toUpperCase() ?? '?'}</div>
                        <span>{post.user_name}</span>
                      </div>
                      <span className={styles.metaItem}>
                        <MessageCircle size={13} />
                        {post.created_at?.slice(0, 10)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← 上一頁</button>
                <span className={styles.pageInfo}>{page} / {totalPages}</span>
                <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一頁 →</button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>加入討論</div>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                分享你的想法與經驗
              </p>
              {user ? (
                canPost && (
                  <button className={styles.sideCtaBtn} onClick={() => setShowModal(true)}>
                    <Plus size={15} />
                    {activeTab === 'wishlist' ? '提出需求' : '發起討論'}
                  </button>
                )
              ) : (
                <button className={styles.sideCtaBtn} onClick={() => {
                  getSupabaseClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
                }}>
                  登入後參與
                </button>
              )}
            </div>

            {/* Wishlist vote rules */}
            {activeTab === 'wishlist' && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardTitle}>許願池投票規則</div>
                <ul className={styles.ruleList}>
                  <li>每人 1 張免費票（不消耗積分）</li>
                  <li>加購票每次 100 積分，計 +2 票</li>
                  <li>最多加購 2 次（共 +4 票）</li>
                  <li>票數最多的優先開發</li>
                </ul>
              </div>
            )}

            {/* Category filter */}
            {categories.length > 0 && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardTitle}>主題分類</div>
                <div className={styles.catList}>
                  <button
                    className={`${styles.catChip} ${!categoryFilter ? styles.active : ''}`}
                    onClick={() => setCategoryFilter('')}
                  >全部</button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`${styles.catChip} ${categoryFilter === cat ? styles.active : ''}`}
                      onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                    >{cat}</button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>社群守則</div>
              <ul className={styles.ruleList}>
                <li>保持友善與尊重，對事不對人</li>
                <li>提供有建設性的回饋與建議</li>
                <li>勿發布廣告或無關內容</li>
                <li>保護個人隱私資訊</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* New Post Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {activeTab === 'wishlist' ? '✨ 提出 AI 工具需求' : '💬 發起討論'}
              </h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePostSubmit} style={{ padding: '8px 0' }}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>標題 *</label>
                <input
                  className={styles.modalInput}
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder={activeTab === 'wishlist' ? '你希望有什麼 AI 工具或功能？' : '討論主題標題'}
                  required
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>內容 *（支援 Markdown）</label>
                <textarea
                  className={styles.modalTextarea}
                  value={form.content}
                  onChange={e => setField('content', e.target.value)}
                  placeholder={activeTab === 'wishlist'
                    ? '詳細描述你的需求，說明使用情境...'
                    : '分享你的想法、問題或經驗...'}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>分類</label>
                  <input
                    list="forum-cats"
                    className={styles.modalInput}
                    value={form.category}
                    onChange={e => setField('category', e.target.value)}
                    placeholder="選擇或輸入分類"
                  />
                  <datalist id="forum-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>分類僅為標籤，不影響文章所在的標籤頁</span>
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>標籤（逗號分隔，最多 3 個）</label>
                  <input
                    className={styles.modalInput}
                    value={form.tagsRaw}
                    onChange={e => setField('tagsRaw', e.target.value)}
                    placeholder="例：提示詞, ChatGPT"
                  />
                </div>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>相關連結（選填）</label>
                <input
                  className={styles.modalInput}
                  value={form.link_url}
                  onChange={e => setField('link_url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>圖片（選填）</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={imgInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImgFileChange}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={imgUploading}
                  >
                    {imgUploading ? '上傳中...' : '上傳圖片'}
                  </button>
                  {form.image_url && (
                    <span style={{ fontSize: 12, color: 'var(--color-success, #22c55e)' }}>✅ 圖片已上傳</span>
                  )}
                </div>
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="預覽" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={posting}>
                  {posting ? '發布中...' : '發布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityContent />
    </Suspense>
  );
}
