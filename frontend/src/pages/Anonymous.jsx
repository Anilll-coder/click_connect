import React, { useEffect, useState, useCallback } from "react";
import PostCard from "../components/PostCard";

const API_BASE = "http://localhost:8000";
const PAGE_LIMIT = 12;

export default function AnonymousPage() {
  // STATE
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);

  // comments state: map postId -> { items, skip, loading, more }
  const [commentsMap, setCommentsMap] = useState({});
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});

  const token = localStorage.getItem("cc_token");
  const isLoggedIn = Boolean(token);

  // robust anonymous detector: accepts boolean, number, or string values
  function isAnonymousTrue(post) {
    if (!post) return false;
    const v = post.is_anonymous;
    if (v === true || v === 1) return true;
    if (v === false || v === 0) return false;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "1" || s === "true" || s === "yes";
    }
    return false;
  }

  // Anonymous filter (client-side) - keep ONLY anonymous
  const keepAnonymous = (arr) =>
    Array.isArray(arr) ? arr.filter((p) => isAnonymousTrue(p)) : [];

  // -----------------------------
  // Fetch Initial Posts (anonymous only)
  // -----------------------------
  async function fetchInitial() {
    setLoading(true);
    try {
      const headers = {};
      const tokenLocal = localStorage.getItem("cc_token");
      if (tokenLocal) headers.Authorization = `Bearer ${tokenLocal}`;

      // Pass is_anonymous=true
      const res = await fetch(`${API_BASE}/posts?skip=0&limit=${PAGE_LIMIT}&is_anonymous=true`, { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        return fetchInitial();
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("fetchInitial failed:", t);
        throw new Error(t || "Failed to fetch posts");
      }

      const body = await res.json();
      console.log("fetchInitial body:", body);

      let postsArr = [];
      if (Array.isArray(body)) postsArr = body;
      else if (body && Array.isArray(body.posts)) postsArr = body.posts;
      else {
        console.error("unexpected posts shape", body);
        return;
      }

      const visible = keepAnonymous(postsArr);
      setPosts(visible);
      setSkip(visible.length);
    } catch (err) {
      console.error("fetchInitial error:", err);
      alert("Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Load More (anonymous filtered)
  // -----------------------------
  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const headers = {};
      const tokenLocal = localStorage.getItem("cc_token");
      if (tokenLocal) headers.Authorization = `Bearer ${tokenLocal}`;

      const res = await fetch(`${API_BASE}/posts?skip=${skip}&limit=${PAGE_LIMIT}&is_anonymous=true`, { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        return loadMore();
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("loadMore failed:", t);
        throw new Error(t || "Failed to load more");
      }

      const body = await res.json();
      console.log("loadMore body:", body);

      let newPosts = Array.isArray(body) ? body : (body && Array.isArray(body.posts) ? body.posts : []);
      const visible = keepAnonymous(newPosts);
      setPosts((p) => [...p, ...visible]);
      setSkip((s) => s + visible.length);
    } catch (err) {
      console.error("loadMore error:", err);
      alert("Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // Like Toggle (sends auth header)
  // -----------------------------
  const toggleLike = useCallback(
    async (postId) => {
      if (!isLoggedIn) {
        alert("Login to like posts.");
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/interactions/like/${postId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const t = await res.text();
          console.error("toggleLike failed:", t);
          throw new Error(t || "Failed to toggle like");
        }
        const data = await res.json();
        if (!data || typeof data.liked === "undefined") {
          console.error("toggleLike: unexpected response", data);
          throw new Error("Unexpected toggle response");
        }
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, liked_by_current_user: data.liked, likes_count: data.likes_count }
              : p
          )
        );
      } catch (err) {
        console.error("toggleLike error:", err);
        alert("Could not update like — try again.");
      }
    },
    [token, isLoggedIn]
  );

  // -----------------------------
  // COMMENTS: fetch, open, submit
  // -----------------------------
  async function fetchComments(postId, more = false) {
    // set loading for this post
    setCommentsMap((m) => ({ ...(m || {}), [postId]: { ...(m?.[postId] || {}), loading: true } }));

    // derive skip value from latest map safely
    const current = commentsMap[postId] || { items: [], skip: 0 };
    const skipVal = more ? (current.skip || current.items.length || 0) : 0;

    try {
      const headers = {};
      const tokenLocal = localStorage.getItem("cc_token");
      if (tokenLocal) headers.Authorization = `Bearer ${tokenLocal}`;

      const res = await fetch(`${API_BASE}/interactions/comments/${postId}?skip=${skipVal}&limit=20`, { headers });
      console.log("fetchComments status:", res.status, "postId:", postId);
      if (!res.ok) {
        const t = await res.text();
        console.error("fetchComments failed:", t);
        throw new Error(t || "Failed to fetch comments");
      }

      const data = await res.json();
      console.log("fetchComments body:", data);
      if (!Array.isArray(data)) {
        console.error("fetchComments: unexpected response", data);
        throw new Error("Unexpected comments response shape");
      }

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

  async function submitComment(postId) {
    if (!isLoggedIn) {
      alert("Please login to comment.");
      return;
    }

    const text = (commentInputs[postId] || "").trim();
    if (!text) return;
    if (commentSubmitting[postId]) return;

    setCommentSubmitting((s) => ({ ...(s || {}), [postId]: true }));

    try {
      const headers = { "Content-Type": "application/json" };
      const tokenLocal = localStorage.getItem("cc_token");
      if (tokenLocal) headers.Authorization = `Bearer ${tokenLocal}`;

      const res = await fetch(`${API_BASE}/interactions/comment/${postId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text }),
      });

      console.log("submitComment status:", res.status, "postId:", postId);
      if (!res.ok) {
        let errBody = null;
        try { errBody = await res.json(); } catch (_) { errBody = await res.text().catch(() => null); }
        console.error("submitComment failed:", errBody);
        throw new Error((errBody && (errBody.detail || errBody.message)) || `Failed to post comment (status ${res.status})`);
      }

      const created = await res.json();
      console.log("submitComment body:", created);
      if (!created || !created.id) {
        console.error("submitComment: unexpected response", created);
        throw new Error("Unexpected comment response from server");
      }

      // append to comments list
      setCommentsMap((m) => {
        const prev = m?.[postId] || { items: [], skip: 0 };
        const newItems = [...(prev.items || []), created];
        return {
          ...m,
          [postId]: {
            items: newItems,
            skip: (prev.skip || prev.items.length || 0) + 1,
            loading: false,
            more: prev.more || false,
          },
        };
      });

      // increment comment count in posts
      setPosts((p) => p.map((post) => (post.id === postId ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post)));

      // clear input
      setCommentInputs((c) => ({ ...(c || {}), [postId]: "" }));
    } catch (err) {
      console.error("submitComment error:", err);
      alert(err.message || "Could not add comment.");
    } finally {
      setCommentSubmitting((s) => ({ ...(s || {}), [postId]: false }));
    }
  }

  // -----------------------------
  // RENDER ANONYMOUS PAGE
  // -----------------------------
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">


      {loading ? (
        <div className="flex justify-center items-center py-10">
          <svg className="animate-spin h-8 w-8 text-fuchsia-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-gray-600 font-medium">Loading anonymous posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-md border border-gray-100">
          <p className="text-xl text-gray-600 font-medium mb-2">No anonymous posts yet! 🕵️</p>
          <p className="text-gray-500">Be the first to share a secret.</p>
        </div>
      ) : (
        posts.map((p) => (
          <PostCard 
            key={p.id} 
            post={p} 
            commentsMap={commentsMap}
            openCommentsFor={openCommentsFor}
            commentInputs={commentInputs}
            commentSubmitting={commentSubmitting}
            isLoggedIn={isLoggedIn}
            toggleLike={toggleLike}
            openComments={openComments}
            submitComment={submitComment}
            fetchComments={fetchComments}
            setCommentInputs={setCommentInputs}
          />
        ))
      )}

      {/* LOAD MORE */}
      <div className="text-center py-4">
        {posts.length > 0 && posts.length >= PAGE_LIMIT && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-full shadow-md"
          >
            {loadingMore ? "Loading..." : "Load More Secrets"}
          </button>
        )}
        {posts.length > 0 && posts.length === skip && !loadingMore && (
          <p className="text-gray-500 text-sm mt-3">You've reached the end of the secrets!</p>
        )}
      </div>
    </div>
  );
}
