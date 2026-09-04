import React, { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";
import { API_BASE, getAuthToken } from "../utils/helpers";
import { EmptyState, PostSkeleton } from "../components/ui";

const PAGE_LIMIT = 12;

export default function SavedPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [commentsMap, setCommentsMap] = useState({});
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  const token = getAuthToken();

  async function fetchInitial() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookmarks?skip=0&limit=${PAGE_LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      const body = await res.json();
      const arr = Array.isArray(body) ? body : [];
      setPosts(arr);
      setSkip(arr.length);
    } catch (err) {
      console.error("fetchInitial error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${API_BASE}/bookmarks?skip=${skip}&limit=${PAGE_LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load more");
      const body = await res.json();
      const arr = Array.isArray(body) ? body : [];
      setPosts((p) => [...p, ...arr]);
      setSkip((s) => s + arr.length);
    } catch (err) {
      console.error("loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLike = useCallback(
    async (postId) => {
      try {
        const res = await fetch(`${API_BASE}/interactions/like/${postId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to toggle like");
        const data = await res.json();
        if (data && typeof data.liked !== "undefined") {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, liked_by_current_user: data.liked, likes_count: data.likes_count } : p
            )
          );
        }
      } catch (err) {
        console.error("toggleLike error:", err);
      }
    },
    [token]
  );

  async function editPost(postId, body) {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update post");
    }
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, body } : p)));
  }

  async function deletePost(postId) {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete post");
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function fetchComments(postId, more = false) {
    setCommentsMap((m) => ({ ...(m || {}), [postId]: { ...(m?.[postId] || {}), loading: true } }));
    const current = commentsMap[postId] || { items: [], skip: 0 };
    const skipVal = more ? current.skip || current.items.length || 0 : 0;

    try {
      const res = await fetch(`${API_BASE}/interactions/comments/${postId}?skip=${skipVal}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setCommentsMap((m) => {
        const prev = m?.[postId] || { items: [], skip: 0 };
        return {
          ...m,
          [postId]: {
            items: more ? [...(prev.items || []), ...data] : data,
            skip: (more ? prev.skip : 0) + data.length,
            loading: false,
            more: data.length === 20,
          },
        };
      });
    } catch (err) {
      console.error("fetchComments error:", err);
      setCommentsMap((m) => ({ ...(m || {}), [postId]: { ...(m?.[postId] || { items: [] }), loading: false, more: false } }));
    }
  }

  function openComments(postId) {
    setOpenCommentsFor((cur) => (cur === postId ? null : postId));
    if (!commentsMap[postId]) fetchComments(postId, false);
  }

  function openPostModal(post) {
    setSelectedPost(post);
    setOpenCommentsFor(post.id);
    if (post.comments_count > 0 && !commentsMap[post.id]) fetchComments(post.id, false);
  }

  function closePostModal() {
    setSelectedPost(null);
    setOpenCommentsFor(null);
  }

  async function submitComment(postId) {
    const text = (commentInputs[postId] || "").trim();
    if (!text || commentSubmitting[postId]) return;

    setCommentSubmitting((s) => ({ ...(s || {}), [postId]: true }));
    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const created = await res.json();

      setCommentsMap((m) => {
        const prev = m?.[postId] || { items: [], skip: 0 };
        return { ...m, [postId]: { ...prev, items: [...(prev.items || []), created] } };
      });
      setPosts((p) => p.map((post) => (post.id === postId ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post)));
      setCommentInputs((c) => ({ ...(c || {}), [postId]: "" }));
    } catch (err) {
      console.error("submitComment error:", err);
    } finally {
      setCommentSubmitting((s) => ({ ...(s || {}), [postId]: false }));
    }
  }

  return (
    <div className="page">
      <header className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Saved Posts</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Posts you've bookmarked to read later</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
          <Bookmark className="h-5 w-5" />
        </div>
      </header>

      {loading ? (
        <div className="space-y-5">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved posts yet"
          message="Tap the bookmark icon on any post to save it here."
        />
      ) : (
        <div className="space-y-5">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              commentsMap={commentsMap}
              openCommentsFor={openCommentsFor}
              commentInputs={commentInputs}
              commentSubmitting={commentSubmitting}
              isLoggedIn={true}
              toggleLike={toggleLike}
              openComments={openComments}
              submitComment={submitComment}
              fetchComments={fetchComments}
              setCommentInputs={setCommentInputs}
              onOpen={openPostModal}
              onEdit={editPost}
              onDelete={deletePost}
            />
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && posts.length >= PAGE_LIMIT && (
        <div className="flex flex-col items-center gap-3 py-4">
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary min-w-44">
            {loadingMore ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-slate-600 border-t-blue-500" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}

      <PostModal
        post={selectedPost}
        onClose={closePostModal}
        commentsMap={commentsMap}
        openCommentsFor={openCommentsFor}
        commentInputs={commentInputs}
        commentSubmitting={commentSubmitting}
        isLoggedIn={true}
        toggleLike={toggleLike}
        openComments={openComments}
        submitComment={submitComment}
        fetchComments={fetchComments}
        setCommentInputs={setCommentInputs}
        onEdit={editPost}
        onDelete={async (postId) => {
          await deletePost(postId);
          closePostModal();
        }}
      />
    </div>
  );
}
