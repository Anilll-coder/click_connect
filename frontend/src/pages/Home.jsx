import React, { useEffect, useState, useCallback } from "react";
import { Flame } from "lucide-react";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";
import { API_BASE, getAuthToken, isLoggedIn, isAnonymousTrue } from "../utils/helpers";
import { EmptyState, PostSkeleton } from "../components/ui";

const PAGE_LIMIT = 12;

export default function HomePage() {
  const [feedTab, setFeedTab] = useState("forYou");
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
  const authenticated = isLoggedIn();

  async function editPost(postId, body) {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete post");
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  const keepNonAnonymous = (arr) =>
    Array.isArray(arr) ? arr.filter((p) => !isAnonymousTrue(p)) : [];

  function feedUrl(skipVal) {
    return feedTab === "following"
      ? `${API_BASE}/posts/feed/following?skip=${skipVal}&limit=${PAGE_LIMIT}`
      : `${API_BASE}/posts?skip=${skipVal}&limit=${PAGE_LIMIT}`;
  }

  async function fetchInitial() {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(feedUrl(0), { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        setFeedTab("forYou");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch posts");

      const body = await res.json();
      let postsArr = Array.isArray(body) ? body : body?.posts || [];
      const visible = keepNonAnonymous(postsArr);
      setPosts(visible);
      setSkip(visible.length);
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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(feedUrl(skip), { headers });
      if (!res.ok) throw new Error("Failed to load more");

      const body = await res.json();
      let newPosts = Array.isArray(body) ? body : body?.posts || [];
      const visible = keepNonAnonymous(newPosts);
      setPosts((p) => [...p, ...visible]);
      setSkip((s) => s + visible.length);
    } catch (err) {
      console.error("loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTab]);

  const toggleLike = useCallback(
    async (postId) => {
      if (!authenticated) return;
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
              p.id === postId
                ? { ...p, liked_by_current_user: data.liked, likes_count: data.likes_count }
                : p
            )
          );
        }
      } catch (err) {
        console.error("toggleLike error:", err);
      }
    },
    [token, authenticated]
  );

  async function fetchComments(postId, more = false) {
    setCommentsMap((m) => ({ ...(m || {}), [postId]: { ...(m?.[postId] || {}), loading: true } }));
    const current = commentsMap[postId] || { items: [], skip: 0 };
    const skipVal = more ? current.skip || current.items.length || 0 : 0;

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${API_BASE}/interactions/comments/${postId}?skip=${skipVal}&limit=20`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Unexpected comments response");

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
    if (!authenticated) return;
    const text = (commentInputs[postId] || "").trim();
    if (!text || commentSubmitting[postId]) return;

    setCommentSubmitting((s) => ({ ...(s || {}), [postId]: true }));
    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const created = await res.json();
      if (!created || !created.id) throw new Error("Unexpected comment response");

      setCommentsMap((m) => {
        const prev = m?.[postId] || { items: [], skip: 0 };
        return {
          ...m,
          [postId]: {
            items: [...(prev.items || []), created],
            skip: (prev.skip || prev.items.length || 0) + 1,
            loading: false,
            more: prev.more || false,
          },
        };
      });
      setPosts((p) =>
        p.map((post) => (post.id === postId ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post))
      );
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
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            Home Feed
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Latest posts from the community</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg shadow-orange-500/30">
          <Flame className="h-5 w-5" />
        </div>
      </header>

      {authenticated && (
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800/60">
          {[
            { id: "forYou", label: "For You" },
            { id: "following", label: "Following" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFeedTab(tab.id)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                feedTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-sky-400"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        feedTab === "following" ? (
          <EmptyState
            title="Nothing here yet"
            message="Posts from people you follow will show up here. Try following someone from their profile."
          />
        ) : (
          <EmptyState
            title="No posts yet"
            message="Be the first to share something amazing with the community."
            action={
              <button onClick={() => window.location.assign("/create")} className="btn-primary">
                Create a post
              </button>
            }
          />
        )
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
              isLoggedIn={authenticated}
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
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary min-w-44"
          >
            {loadingMore ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-slate-600 border-t-blue-500" />
                Loading...
              </>
            ) : (
              "Load More Posts"
            )}
          </button>
          {posts.length === skip && !loadingMore && (
            <p className="text-xs text-gray-400 dark:text-gray-500">You've reached the end of the feed!</p>
          )}
        </div>
      )}

      <PostModal
        post={selectedPost}
        onClose={closePostModal}
        commentsMap={commentsMap}
        openCommentsFor={openCommentsFor}
        commentInputs={commentInputs}
        commentSubmitting={commentSubmitting}
        isLoggedIn={authenticated}
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
