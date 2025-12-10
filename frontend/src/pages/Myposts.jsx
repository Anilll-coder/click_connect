// pages/MyPosts.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

function useAuthToken() {
  return localStorage.getItem("cc_token");
}

function timeAgo(iso) {
  if (!iso) return "";
  let dateStr = iso;
  if (!dateStr.endsWith("Z") && !dateStr.includes("+")) {
    dateStr += "Z";
  }
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyPosts() {
  const token = useAuthToken();
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
      setPosts(prev => (reset ? data : [...prev, ...data]));
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
    setPosts(prev => prev.filter(p => p.id !== postId));
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
  function cancelEdit() { setEditing(null); }

  async function saveEdit() {
    if (!editing || !editing.text.trim()) {
      alert("Post body cannot be empty");
      return;
    }
    const { id, text } = editing;
    const old = posts;
    
    // Clear editing state first to prevent glitching
    setEditing(null);
    
    // Update post optimistically
    setPosts(prev => prev.map(p => (p.id === id ? { ...p, body: text } : p)));
    
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
      setPosts(prev => prev.map(p => (p.id === id ? { ...p, body: updated.body } : p)));
    } catch (err) {
      alert(err.message || "Save failed");
      setPosts(old);
    }
  }

  // ===== Likes =====
  async function toggleLike(post) {
    if (!token) {
      nav("/login");
      return;
    }
    const postId = post.id;
    if (liking[postId]) return; // prevent double clicks
    setLiking(prev => ({ ...prev, [postId]: true }));

    // optimistic update
    const old = posts;
    const liked = !!post.liked_by_current_user;
    const newPosts = posts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        liked_by_current_user: !liked,
        likes_count: (p.likes_count || 0) + (liked ? -1 : 1),
      };
    });
    setPosts(newPosts);

    try {
      const method = liked ? "DELETE" : "POST";
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
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, likes_count: data.likes_count, liked_by_current_user: !!data.liked } : p)));
      }
    } catch (err) {
      alert(err.message || "Failed to update like");
    } finally {
      setLiking(prev => ({ ...prev, [postId]: false }));
    }
  }

  // ===== Comments =====
  async function loadComments(postId) {
    if (commentsCache[postId]) {
      setCommentsOpen(prev => ({ ...prev, [postId]: !prev[postId] }));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/interactions/comments/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Failed to load comments");
      }
      const data = await res.json();
      setCommentsCache(prev => ({ ...prev, [postId]: data }));
      setCommentsOpen(prev => ({ ...prev, [postId]: true }));
    } catch (err) {
      alert(err.message || "Could not load comments");
    }
  }

  async function postComment(postId) {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    // optimistic add
    const fake = {
      id: `tmp-${Date.now()}`,
      text: text,
      author: { id: null, username: "You", avatar_url: null },
      created_at: new Date().toISOString(),
      is_temp: true,
    };
    setCommentsCache(prev => ({ ...(prev || {}), [postId]: [...(prev[postId] || []), fake] }));
    setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
    // bump comments_count on post
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count||0)+1 } : p));

    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error("Post comment failed");
      }
      const created = await res.json();
      setCommentsCache(prev => {
        const arr = prev[postId] || [];
        return {
          ...prev,
          [postId]: arr.map(c => c.is_temp ? created : c),
        };
      });
    } catch (err) {
      alert(err.message || "Failed to post comment");
      setCommentsCache(prev => {
        const arr = (prev[postId] || []).filter(c => !c.is_temp);
        return { ...prev, [postId]: arr };
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count||0)-1) } : p));
    }
  }

  // ===== Media rendering helpers =====
  function MediaGrid({ media = [] }) {
    // single media: center it and cap width
    if (media.length === 1) {
      const m = media[0];
      return (
        <div className="mt-3 flex justify-center">
          <div className="rounded-lg overflow-hidden bg-gray-50" style={{ maxWidth: 700, width: "100%" }}>
            {m.media_type === "video" ? (
              <video controls className="w-full max-h-[60vh] object-contain">
                <source src={m.url} />
              </video>
            ) : (
              <img src={m.url} alt="post-media" className="w-full h-auto max-h-[60vh] object-contain" />
            )}
          </div>
        </div>
      );
    }

    // multiple media: responsive grid
    return (
      <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((m, i) => (
          <div key={i} className="rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center" style={{ maxHeight: "60vh" }}>
            {m.media_type === "video" ? (
              <video controls className="w-full h-48 sm:h-56 md:h-64 object-cover">
                <source src={m.url} />
              </video>
            ) : (
              <img src={m.url} alt={`media-${i}`} className="w-full h-48 sm:h-56 md:h-64 object-cover" />
            )}
          </div>
        ))}
      </div>
    );
  }

  function PostCard({ post }) {
    const isLiked = !!post.liked_by_current_user;
    return (
      <article className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <img
            src={post.author?.avatar_url || "/default-avatar.png"}
            alt={post.author?.username || "me"}
            className="w-11 h-11 rounded-full object-cover border border-gray-300 block shrink-0 flex-shrink-0"
            style={{ minWidth: 44, minHeight: 44 }}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{post.author?.username || "You"}</div>
                <div className="text-xs text-gray-500">{timeAgo(post.created_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(post)} className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Edit</button>
                <button onClick={() => handleDelete(post.id)} disabled={deleting === post.id} className="text-sm px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">
                  {deleting === post.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            {editing && editing.id === post.id ? (
              <div className="mt-3" key={`edit-${post.id}`}>
                <textarea
                  key={`textarea-${post.id}`}
                  value={editing.text}
                  onChange={(e) => setEditing({ id: editing.id, text: e.target.value })}
                  className="w-full p-3 rounded-lg bg-gray-50 border border-gray-100 resize-none"
                  rows={4}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveEdit} className="px-3 py-1 rounded bg-linear-to-r from-fuchsia-500 to-amber-400 text-white">Save</button>
                  <button onClick={cancelEdit} className="px-3 py-1 rounded bg-gray-100">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-3 text-gray-700 whitespace-pre-wrap">{post.body}</p>

                {/* Media */}
                {post.media && post.media.length > 0 && <MediaGrid media={post.media} />}

                {/* Likes / Comments row */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleLike(post)}
                      disabled={liking[post.id]}
                      className={`px-3 py-1 rounded flex items-center gap-2 ${isLiked ? "bg-rose-50 text-rose-600" : "bg-gray-100"}`}
                    >
                      <span>{isLiked ? "♥" : "♡"}</span>
                      <span className="text-sm">{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => loadComments(post.id)}
                      className="px-3 py-1 rounded bg-gray-100 flex items-center gap-2"
                    >
                      💬 <span className="text-sm">{post.comments_count || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Comments panel */}
                {commentsOpen[post.id] && (
                  <div className="mt-3 border-t pt-3">
                    <div className="space-y-3 max-h-64 overflow-auto">
                      {(commentsCache[post.id] || []).map(c => (
                        <div key={c.id} className="flex items-start gap-3">
                          <img src={"http://localhost:8000"+c.author?.avatar_url || "/default-avatar.png"} alt={c.author?.username || "u"} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm"><span className="font-semibold mr-2">{c.author?.username || "User"}</span><span className="text-xs text-gray-500">{timeAgo(c.created_at)}</span></div>
                            <div className="text-gray-700 mt-1">{c.text}</div>
                          </div>
                        </div>
                      ))}
                      {(!commentsCache[post.id] || commentsCache[post.id].length === 0) && <div className="text-sm text-gray-500">No comments yet.</div>}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={commentDrafts[post.id] || ""}
                        onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Write a comment..."
                        className="flex-1 rounded p-2 border"
                      />
                      <button onClick={() => postComment(post.id)} className="px-3 py-1 rounded bg-linear-to-r from-fuchsia-500 to-amber-400 text-white">Send</button>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Posts</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => nav("/create")} className="px-3 py-1 rounded bg-linear-to-r from-fuchsia-500 to-amber-400 text-white">New Post</button>
          <button onClick={() => fetchPosts(true)} className="px-3 py-1 rounded bg-gray-50">Refresh</button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading your posts...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">You haven't posted yet — create your first post.</div>
        ) : (
          posts.map(p => <PostCard key={p.id} post={p} />)
        )}
      </div>

      <div className="text-center mt-6">
        <button onClick={() => fetchPosts(false)} disabled={loadingMore} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      </div>
    </div>
  );
}
