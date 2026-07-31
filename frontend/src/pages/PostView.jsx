import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileQuestion } from "lucide-react";
import PostCard from "../components/PostCard";
import { API_BASE, getAuthToken } from "../utils/helpers";
import { EmptyState, PostSkeleton } from "../components/ui";

export default function PostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});

  const isLoggedIn = !!getAuthToken();

  useEffect(() => {
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchPost() {
    try {
      setLoading(true);
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/posts/${id}`, { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        return fetchPost();
      }
      if (!res.ok) {
        setError(res.status === 404 ? "Post not found" : "Failed to load post");
        return;
      }

      const data = await res.json();
      setPost(data);

      if (data.comments_count > 0) {
        setOpenCommentsFor(data.id);
        fetchComments(data.id);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(postId) {
    const token = getAuthToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/interactions/like/${postId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPost((prev) => ({
          ...prev,
          liked_by_current_user: data.liked,
          likes_count: (prev.likes_count || 0) + (data.liked ? 1 : -1),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchComments(postId, loadMore = false) {
    const existing = commentsMap[postId] || { items: [], skip: 0, loading: false, more: true };
    if (existing.loading) return;

    setCommentsMap((m) => ({ ...m, [postId]: { ...existing, loading: true } }));

    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const skip = loadMore ? existing.skip : 0;
      const res = await fetch(`${API_BASE}/interactions/comments/${postId}?skip=${skip}&limit=10`, { headers });
      if (!res.ok) throw new Error("Failed to fetch comments");

      const data = await res.json();
      const newItems = loadMore ? [...existing.items, ...data] : data;

      setCommentsMap((m) => ({
        ...m,
        [postId]: {
          items: newItems,
          skip: newItems.length,
          loading: false,
          more: data.length === 10,
        },
      }));
    } catch (err) {
      console.error(err);
      setCommentsMap((m) => ({ ...m, [postId]: { ...existing, loading: false } }));
    }
  }

  function openComments(postId) {
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null);
    } else {
      setOpenCommentsFor(postId);
      if (!commentsMap[postId]) fetchComments(postId);
    }
  }

  async function submitComment(postId) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const token = getAuthToken();
    if (!token) return;

    setCommentSubmitting((s) => ({ ...s, [postId]: true }));

    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        setCommentInputs((s) => ({ ...s, [postId]: "" }));
        setPost((prev) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
        fetchComments(postId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting((s) => ({ ...s, [postId]: false }));
    }
  }

  return (
    <div className="page max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="animate-fade-in flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-blue-600 dark:hover:text-sky-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {loading ? (
        <PostSkeleton />
      ) : error ? (
        <EmptyState
          icon={FileQuestion}
          title={error}
          message="This post may have been deleted or never existed."
          action={
            <button onClick={() => navigate("/")} className="btn-primary">
              Go Home
            </button>
          }
        />
      ) : (
        post && (
          <PostCard
            post={post}
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
        )
      )}
    </div>
  );
}
