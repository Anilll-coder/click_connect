import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Mail, CalendarDays } from "lucide-react";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";
import { API_BASE, getAuthToken, isLoggedIn, resolveAsset } from "../utils/helpers";
import { EmptyState, PostSkeleton } from "../components/ui";

const PAGE_LIMIT = 12;

export default function UserProfilePage() {
  const { username } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [userInfo, setUserInfo] = useState(null);

  const [commentsMap, setCommentsMap] = useState({});
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  const token = getAuthToken();
  const authenticated = isLoggedIn();

  async function fetchUserProfile() {
    try {
      const res = await fetch(`${API_BASE}/auth/user/${username}`);
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      }
    } catch (err) {
      console.error("fetchUserProfile error:", err);
    }
  }

  async function fetchInitial() {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/posts/user/${username}?skip=0&limit=${PAGE_LIMIT}`, { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        return fetchInitial();
      }
      if (!res.ok) throw new Error("Failed to fetch posts");
      const body = await res.json();
      const postsArr = Array.isArray(body) ? body : [];
      setPosts(postsArr);
      setSkip(postsArr.length);
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
      const res = await fetch(`${API_BASE}/posts/user/${username}?skip=${skip}&limit=${PAGE_LIMIT}`, { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        return loadMore();
      }
      if (!res.ok) throw new Error("Failed to load more");
      const body = await res.json();
      const newPosts = Array.isArray(body) ? body : [];
      setPosts((p) => [...p, ...newPosts]);
      setSkip((s) => s + newPosts.length);
    } catch (err) {
      console.error("loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchUserProfile();
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
      {/* Profile header */}
      {userInfo && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="h-28 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400 sm:h-32" />
          <div className="relative px-2 sm:px-3">
            <div className="-mt-14 flex items-end justify-between sm:-mt-16">
              <img
                src={resolveAsset(userInfo.avatar_url)}
                alt={userInfo.username}
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-xl dark:border-slate-800 sm:h-28 sm:w-28"
              />
            </div>
            <div className="mt-4">
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                {userInfo.username}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  {posts.length} public {posts.length === 1 ? "post" : "posts"}
                </span>
                {userInfo.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    {userInfo.email}
                  </span>
                )}
                {userInfo.created_at && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    Joined {new Date(userInfo.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              {userInfo.bio && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">{userInfo.bio}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-5">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No public posts yet"
          message={`${userInfo?.username || "This user"} hasn't shared any public posts.`}
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
              isLoggedIn={authenticated}
              toggleLike={toggleLike}
              openComments={openComments}
              submitComment={submitComment}
              fetchComments={fetchComments}
              setCommentInputs={setCommentInputs}
              onOpen={openPostModal}
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
              "Load More Posts"
            )}
          </button>
          {posts.length === skip && !loadingMore && (
            <p className="text-xs text-gray-400 dark:text-gray-500">You've reached the end!</p>
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
      />
    </div>
  );
}
