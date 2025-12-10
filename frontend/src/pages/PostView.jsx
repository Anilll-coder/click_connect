import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";

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

  const isLoggedIn = !!localStorage.getItem("cc_token");

  useEffect(() => {
    fetchPost();
  }, [id]);

  async function fetchPost() {
    try {
      setLoading(true);
      const token = localStorage.getItem("cc_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await fetch(`http://localhost:8000/posts/${id}`, { headers });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        return fetchPost();
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError("Post not found");
        } else {
          setError("Failed to load post");
        }
        return;
      }
      
      const data = await res.json();
      setPost(data);
      
      // Auto-open comments for single post view
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
    const token = localStorage.getItem("cc_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/interactions/like/${postId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPost((prev) => ({
          ...prev,
          liked_by_current_user: data.liked,
          likes_count: prev.likes_count + (data.liked ? 1 : -1),
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

    const token = localStorage.getItem("cc_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const skip = loadMore ? existing.skip : 0;
      const res = await fetch(`http://localhost:8000/interactions/comments/${postId}?skip=${skip}&limit=10`, { headers });
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
      if (!commentsMap[postId]) {
        fetchComments(postId);
      }
    }
  }

  async function submitComment(postId) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const token = localStorage.getItem("cc_token");
    if (!token) return;

    setCommentSubmitting((s) => ({ ...s, [postId]: true }));

    try {
      const res = await fetch(`http://localhost:8000/interactions/comment/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        setCommentInputs((s) => ({ ...s, [postId]: "" }));
        setPost((prev) => ({ ...prev, comments_count: prev.comments_count + 1 }));
        fetchComments(postId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting((s) => ({ ...s, [postId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
      >
        ← Back
      </button>
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
    </div>
  );
}
