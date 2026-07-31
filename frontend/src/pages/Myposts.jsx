import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  FileText,
  Pencil,
  Trash2,
  Send,
  Plus,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { API_BASE, getAuthToken, resolveAsset, timeAgo } from "../utils/helpers";
import { EmptyState, PostSkeleton } from "../components/ui";
import PostModal from "../components/PostModal";

export default function MyPosts() {
  const token = getAuthToken();
  const nav = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [commentsCache, setCommentsCache] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [liking, setLiking] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchPosts(true);
    // eslint-disable-next-line
  }, []);

  async function fetchPosts(reset = false) {
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(`${API_BASE}/posts/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        nav("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts((prev) => (reset ? data : [...prev, ...data]));
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleDelete(postId) {
    if (!confirm("Delete this post? This action cannot be undone.")) return;
    setDeleting(postId);
    const old = posts;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setPosts(old);
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Delete failed");
      }
    } catch (err) {
      alert(err.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(post) {
    setEditing({ id: post.id, text: post.body });
  }
  function cancelEdit() {
    setEditing(null);
  }

  async function saveEdit() {
    if (!editing || !editing.text.trim()) {
      alert("Post body cannot be empty");
      return;
    }
    const { id, text } = editing;
    const old = posts;

    setEditing(null);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, body: text } : p)));

    try {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        setPosts(old);
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Save failed");
      }
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, body: updated.body } : p)));
    } catch (err) {
      alert(err.message || "Save failed");
      setPosts(old);
    }
  }

  async function toggleLike(post) {
    if (!token) {
      nav("/login");
      return;
    }
    const postId = post.id;
    if (liking[postId]) return;
    setLiking((prev) => ({ ...prev, [postId]: true }));

    const old = posts;
    const liked = !!post.liked_by_current_user;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_current_user: !liked,
              likes_count: (p.likes_count || 0) + (liked ? -1 : 1),
            }
          : p
      )
    );

    try {
      const res = await fetch(`${API_BASE}/interactions/like/${postId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setPosts(old);
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Like failed");
      }
      const data = await res.json().catch(() => ({}));
      if (data && typeof data.likes_count !== "undefined") {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likes_count: data.likes_count, liked_by_current_user: !!data.liked }
              : p
          )
        );
      }
    } catch (err) {
      alert(err.message || "Failed to update like");
    } finally {
      setLiking((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function loadComments(postId) {
    if (commentsCache[postId]) {
      setCommentsOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/interactions/comments/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      setCommentsCache((prev) => ({ ...prev, [postId]: data }));
      setCommentsOpen((prev) => ({ ...prev, [postId]: true }));
    } catch (err) {
      alert(err.message || "Could not load comments");
    }
  }

  async function ensureComments(postId) {
    if (commentsCache[postId]) return;
    try {
      const res = await fetch(`${API_BASE}/interactions/comments/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCommentsCache((prev) => ({ ...prev, [postId]: data }));
      }
    } catch (err) {
      console.error("Could not load comments", err);
    }
  }

  function openPostModal(post) {
    setSelectedPost(post);
    setCommentsOpen((prev) => ({ ...prev, [post.id]: true }));
    ensureComments(post.id);
  }

  function closePostModal() {
    setSelectedPost(null);
  }

  function modalOpenComments(postId) {
    setCommentsOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
    ensureComments(postId);
  }

  function modalToggleLike(postId) {
    const p = posts.find((x) => x.id === postId);
    if (p) toggleLike(p);
  }

  async function postComment(postId) {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const fake = {
      id: `tmp-${Date.now()}`,
      text: text,
      author: { id: null, username: "You", avatar_url: null },
      created_at: new Date().toISOString(),
      is_temp: true,
    };
    setCommentsCache((prev) => ({ ...(prev || {}), [postId]: [...(prev[postId] || []), fake] }));
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
    );

    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Post comment failed");
      const created = await res.json();
      setCommentsCache((prev) => {
        const arr = prev[postId] || [];
        return { ...prev, [postId]: arr.map((c) => (c.is_temp ? created : c)) };
      });
    } catch (err) {
      alert(err.message || "Failed to post comment");
      setCommentsCache((prev) => {
        const arr = (prev[postId] || []).filter((c) => !c.is_temp);
        return { ...prev, [postId]: arr };
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p
        )
      );
    }
  }

  function MediaGrid({ media = [] }) {
    if (media.length === 1) {
      const m = media[0];
      return (
        <div className="mt-3 flex justify-center">
          <div className="w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-slate-800/60" style={{ maxWidth: 700 }}>
            {m.media_type === "video" ? (
              <video
                controls
                className="max-h-[60vh] w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              >
                <source src={resolveAsset(m.url)} />
              </video>
            ) : (
              <img src={resolveAsset(m.url)} alt="post-media" className="max-h-[60vh] w-full object-contain" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-slate-800/60"
            style={{ maxHeight: "60vh" }}
          >
            {m.media_type === "video" ? (
              <video controls className="h-48 w-full object-cover sm:h-56 md:h-64" onClick={(e) => e.stopPropagation()}>
                <source src={resolveAsset(m.url)} />
              </video>
            ) : (
              <img src={resolveAsset(m.url)} alt={`media-${i}`} className="h-48 w-full object-cover sm:h-56 md:h-64" />
            )}
          </div>
        ))}
      </div>
    );
  }

  function PostCard({ post }) {
    const isLiked = !!post.liked_by_current_user;
    return (
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <img
            src={resolveAsset(post.author?.avatar_url)}
            alt={post.author?.username || "me"}
            className="h-11 w-11 shrink-0 rounded-full border border-gray-200 dark:border-slate-700 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">{post.author?.username || "You"}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.created_at)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => startEdit(post)}
                  className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                  title="Edit post"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deleting === post.id}
                  className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 disabled:opacity-40"
                  title="Delete post"
                >
                  {deleting === post.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-500" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {editing && editing.id === post.id ? (
                <motion.div
                  key={`edit-${post.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-3"
                >
                  <textarea
                    value={editing.text}
                    onChange={(e) => setEditing({ id: editing.id, text: e.target.value })}
                    className="input min-h-[100px] resize-none"
                    rows={4}
                  />
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={saveEdit} className="btn-primary px-4 py-2 text-sm">
                      <Check className="h-4 w-4" /> Save
                    </button>
                    <button onClick={cancelEdit} className="btn-secondary px-4 py-2 text-sm">
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={`view-${post.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p
                    className="mt-3 cursor-pointer whitespace-pre-wrap text-gray-800 dark:text-gray-100"
                    onClick={() => openPostModal(post)}
                  >
                    {post.body}
                  </p>
                  {post.media && post.media.length > 0 && (
                    <div className="cursor-pointer" onClick={() => openPostModal(post)}>
                      <MediaGrid media={post.media} />
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700 pt-3">
                    <button
                      onClick={() => toggleLike(post)}
                      disabled={liking[post.id]}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        isLiked ? "text-rose-500" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${isLiked ? "fill-rose-500" : ""}`} strokeWidth={1.8} />
                      <span>{post.likes_count || 0}</span>
                    </button>
                    <button
                      onClick={() => loadComments(post.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        commentsOpen[post.id] ? "text-blue-500" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                      <span>{post.comments_count || 0}</span>
                    </button>
                  </div>

                  {commentsOpen[post.id] && (
                    <div className="mt-3 border-t border-gray-100 dark:border-slate-700 pt-4">
                      <div className="max-h-64 space-y-3 overflow-y-auto">
                        {(commentsCache[post.id] || []).map((c) => (
                          <div key={c.id} className="flex items-start gap-3">
                            <img
                              src={resolveAsset(c.author?.avatar_url)}
                              alt={c.author?.username || "u"}
                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                  {c.author?.username || "User"}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(c.created_at)}</span>
                              </div>
                              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">{c.text}</p>
                            </div>
                          </div>
                        ))}
                        {(!commentsCache[post.id] || commentsCache[post.id].length === 0) && (
                          <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet.</p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            value={commentDrafts[post.id] || ""}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            className="input pr-10"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                postComment(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => postComment(post.id)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            title="Send"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <div className="page">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">My Posts</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage everything you've shared</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav("/create")} className="btn-primary">
            <Plus className="h-4 w-4" /> New Post
          </button>
          <button onClick={() => fetchPosts(true)} className="btn-secondary" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-5">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : error ? (
        <EmptyState icon={FileText} title="Something went wrong" message={error} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="You haven't posted yet"
          message="Create your first post and share it with the community."
          action={
            <button onClick={() => nav("/create")} className="btn-primary">
              <Plus className="h-4 w-4" /> Create a post
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => fetchPosts(false)}
            disabled={loadingMore}
            className="btn-secondary min-w-40"
          >
            {loadingMore ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-slate-600 border-t-blue-500" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}

      <PostModal
        post={selectedPost}
        onClose={closePostModal}
        commentsMap={Object.fromEntries(
          Object.entries(commentsCache).map(([k, v]) => [
            k,
            { items: v, loading: false, skip: 0, more: false },
          ])
        )}
        openCommentsFor={selectedPost && commentsOpen[selectedPost.id] ? selectedPost.id : null}
        commentInputs={commentDrafts}
        commentSubmitting={{}}
        isLoggedIn={true}
        toggleLike={modalToggleLike}
        openComments={modalOpenComments}
        submitComment={postComment}
        fetchComments={(postId) => ensureComments(postId)}
        setCommentInputs={setCommentDrafts}
      />
    </div>
  );
}
