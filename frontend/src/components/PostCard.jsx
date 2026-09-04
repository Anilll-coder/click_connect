import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  Ghost,
  Send,
  MessageCircleHeart,
  X,
  Pencil,
  Trash2,
  Check,
  Bookmark,
  Flag,
  UserX,
} from "lucide-react";
import { resolveAsset, timeAgo, isAnonymousTrue, API_BASE, getAuthToken } from "../utils/helpers";
import { Dropdown, DropdownItem, ConfirmDialog, ReportDialog } from "./ui";
import { useToast } from "./toastContext";

const HASHTAG_RE = /(#\w*[A-Za-z]\w*)/g;

function renderBodyWithHashtags(text, navigate) {
  const parts = String(text || "").split(HASHTAG_RE);
  return parts.map((part, i) => {
    if (part.startsWith("#") && part.length > 1) {
      return (
        <span
          key={i}
          role="link"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hashtag/${part.slice(1).toLowerCase()}`);
          }}
          className="cursor-pointer font-medium text-blue-600 hover:underline dark:text-sky-400"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// -----------------------------
// MEDIA CAROUSEL
// -----------------------------
function MediaGrid({ media, onImageClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!media?.length) return null;

  const goToPrevious = () =>
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  const goToNext = () =>
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));

  const currentMedia = media[currentIndex];

  return (
    <div className="relative mt-3 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-700/50">
      <div className="relative flex aspect-video max-h-[420px] items-center justify-center bg-black/5 dark:bg-black/30">
        {currentMedia.media_type === "video" ? (
          <video
            className="h-full max-h-[420px] w-full object-contain"
            controls
            src={resolveAsset(currentMedia.url)}
          />
        ) : (
          <img
            src={resolveAsset(currentMedia.url)}
            className={`h-full max-h-[420px] w-full object-contain ${onImageClick ? "cursor-pointer" : ""}`}
            alt=""
            onClick={onImageClick}
          />
        )}
      </div>

      {media.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70"
            aria-label="Previous media"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70"
            aria-label="Next media"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? "w-5 bg-white dark:bg-slate-800" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Go to media ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------
// CONFETTI (like celebration)
// -----------------------------
const ConfettiParticles = () => {
  const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4"];
  const particles = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: Math.random() * 0.6 + 0.4,
            x: (Math.random() - 0.5) * 140,
            y: (Math.random() - 0.5) * 140,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: colors[Math.floor(Math.random() * colors.length)] }}
        />
      ))}
    </div>
  );
};

// -----------------------------
// ACTION BUTTON
// -----------------------------
function ActionButton({ active, activeClass, onClick, disabled, children, label }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : active
            ? activeClass
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 active:scale-95"
      }`}
    >
      {children}
    </button>
  );
}

// -----------------------------
// POST CARD
// -----------------------------
export default function PostCard({
  post,
  commentsMap,
  openCommentsFor,
  commentInputs,
  commentSubmitting,
  isLoggedIn,
  toggleLike,
  openComments,
  submitComment,
  fetchComments,
  setCommentInputs,
  onOpen,
  onClose,
  insideModal,
  onEdit,
  onDelete,
}) {
  const isAnon = isAnonymousTrue(post);
  const navigate = useNavigate();
  const toast = useToast();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [bookmarked, setBookmarked] = useState(!!post.bookmarked_by_current_user);
  const [bookmarking, setBookmarking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [commentActionId, setCommentActionId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const canManage = !!post.is_owner && (onEdit || onDelete);
  const canModerate = !post.is_owner && isLoggedIn;

  const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const startEdit = () => {
    setEditText(post.body);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText(post.body);
  };

  const saveEdit = async () => {
    if (!editText.trim()) {
      toast.error("Post body cannot be empty");
      return;
    }
    setSaving(true);
    try {
      await onEdit(post.id, editText.trim());
      setIsEditing(false);
      toast.success("Post updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(post.id);
      toast.success("Post deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete post");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const handleOpenPost = () => {
    if (!insideModal && onOpen) onOpen(post);
  };

  const author = isAnon
    ? { username: "Anonymous User", avatar_url: "/anonymous-avatar.jpg" }
    : post.author || { username: "Unknown", avatar_url: "/profile-picture.png" };

  const commentsData = commentsMap?.[post.id] || { items: [], loading: false, more: false, skip: 0 };
  const items = commentsData.items || [];
  const isLiked = !!post.liked_by_current_user;

  const handleUserClick = () => {
    if (!isAnon && author.username && author.username !== "Unknown") {
      navigate(`/user/${author.username.trim()}`);
    }
  };

  const handleLike = () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!isLiked) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    }
    toggleLike(post.id);
  };

  const handleBookmark = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (bookmarking) return;
    setBookmarking(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res = await fetch(`${API_BASE}/bookmarks/${post.id}`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to update bookmark");
      const data = await res.json();
      setBookmarked(!!data.bookmarked);
      toast.success(data.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
    } catch (err) {
      setBookmarked(!next);
      toast.error(err.message || "Failed to update bookmark");
    } finally {
      setBookmarking(false);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(postUrl);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = postUrl;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
      document.body.removeChild(textarea);
    }
    toast.success("Link copied to clipboard!");
  };

  const submitReport = async (reason) => {
    setReporting(true);
    try {
      const res = await fetch(`${API_BASE}/moderation/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ target_type: "post", target_id: post.id, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit report");
      }
      toast.success("Report submitted — thanks for letting us know");
      setShowReport(false);
    } catch (err) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setReporting(false);
    }
  };

  const handleBlock = async () => {
    if (!author.username) return;
    setBlocking(true);
    try {
      const res = await fetch(`${API_BASE}/moderation/block/${author.username}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to block user");
      }
      toast.success(`You won't see posts from ${author.username} anymore`);
      setConfirmingBlock(false);
    } catch (err) {
      toast.error(err.message || "Failed to block user");
    } finally {
      setBlocking(false);
    }
  };

  const likeComment = async (commentId) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    setCommentActionId(commentId);
    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${commentId}/like`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to like comment");
      fetchComments(post.id, false);
    } catch (err) {
      toast.error(err.message || "Failed to like comment");
    } finally {
      setCommentActionId(null);
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const saveEditComment = async (commentId) => {
    const text = editingCommentText.trim();
    if (!text) {
      toast.error("Comment cannot be empty");
      return;
    }
    setCommentActionId(commentId);
    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update comment");
      }
      setEditingCommentId(null);
      fetchComments(post.id, false);
      toast.success("Comment updated");
    } catch (err) {
      toast.error(err.message || "Failed to update comment");
    } finally {
      setCommentActionId(null);
    }
  };

  const deleteComment = async (commentId) => {
    setCommentActionId(commentId);
    try {
      const res = await fetch(`${API_BASE}/interactions/comment/${commentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete comment");
      }
      fetchComments(post.id, false);
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete comment");
    } finally {
      setCommentActionId(null);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="card animate-fade-in-up overflow-hidden p-5 transition-all duration-300 hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-600 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-slate-950"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="relative shrink-0"
            onClick={handleUserClick}
            title={author.username}
          >
            <img
              src={resolveAsset(author.avatar_url)}
              alt={author.username}
              className={`h-11 w-11 rounded-full object-cover ring-2 ${
                isAnon
                  ? "ring-gray-200 dark:ring-slate-700"
                  : "cursor-pointer ring-blue-100 dark:ring-slate-700 transition-all hover:ring-blue-300 dark:hover:ring-sky-500/50"
              }`}
            />
            {isAnon && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white ring-2 ring-white">
                <Ghost className="h-3 w-3" />
              </span>
            )}
          </button>
          <div className="min-w-0">
            <button
              className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100 transition-colors hover:text-blue-600 dark:hover:text-sky-400"
              onClick={handleUserClick}
            >
              <span className="truncate">{author.username}</span>
              {isAnon && (
                <span className="rounded-full bg-gray-100 dark:bg-slate-700/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Anonymous
                </span>
              )}
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canManage && !isEditing && (
            <Dropdown>
              {onEdit && <DropdownItem icon={Pencil} onClick={startEdit}>Edit</DropdownItem>}
              {onDelete && (
                <DropdownItem icon={Trash2} danger onClick={() => setConfirmingDelete(true)}>
                  Delete
                </DropdownItem>
              )}
            </Dropdown>
          )}
          {canModerate && (
            <Dropdown>
              <DropdownItem icon={Flag} onClick={() => setShowReport(true)}>Report post</DropdownItem>
              {!isAnon && (
                <DropdownItem icon={UserX} danger onClick={() => setConfirmingBlock(true)}>
                  Block {author.username}
                </DropdownItem>
              )}
            </Dropdown>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {isEditing ? (
        <div className="space-y-2.5">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="input min-h-[100px] resize-none"
            rows={4}
            maxLength={5000}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save
            </button>
            <button onClick={cancelEdit} disabled={saving} className="btn-secondary px-4 py-2 text-sm">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className={`block w-full text-left ${onOpen && !insideModal ? "cursor-pointer" : "cursor-default"}`}
          onClick={handleOpenPost}
        >
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 dark:text-gray-100">
            {renderBodyWithHashtags(post.body, navigate)}
          </p>
        </button>
      )}

      {!isEditing && <MediaGrid media={post.media} onImageClick={handleOpenPost} />}

      {/* Actions */}
      <div className="relative mt-4 flex items-center gap-1 border-t border-gray-100 dark:border-slate-700 pt-2">
        <ActionButton
          active={isLiked}
          activeClass="text-rose-500"
          onClick={handleLike}
          label={isLiked ? "Unlike post" : "Like post"}
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            animate={isLiked ? { scale: [1, 1.25, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart className={`h-5 w-5 ${isLiked ? "fill-rose-500" : ""}`} strokeWidth={1.8} />
          </motion.div>
          <span>{post.likes_count || 0}</span>
        </ActionButton>

        <ActionButton
          active={openCommentsFor === post.id}
          activeClass="text-blue-500"
          onClick={() => openComments(post.id)}
          label="Toggle comments"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
          <span>{post.comments_count || 0}</span>
        </ActionButton>

        <ActionButton onClick={handleShare} label="Copy link to post">
          <Share2 className="h-5 w-5" strokeWidth={1.8} />
        </ActionButton>

        <ActionButton
          active={bookmarked}
          activeClass="text-amber-500"
          onClick={handleBookmark}
          disabled={bookmarking}
          label={bookmarked ? "Remove bookmark" : "Bookmark post"}
        >
          <Bookmark className={`h-5 w-5 ${bookmarked ? "fill-amber-500" : ""}`} strokeWidth={1.8} />
        </ActionButton>

        {showConfetti && <ConfettiParticles />}
      </div>

      {/* Comments */}
      <AnimatePresence initial={false}>
        {openCommentsFor === post.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-gray-100 dark:border-slate-700 pt-4">
              {commentsData.loading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-gray-400 dark:text-gray-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 dark:border-slate-700 border-t-blue-500" />
                  Loading comments...
                </div>
              ) : (
                <>
                  <div className="max-h-64 space-y-4 overflow-y-auto pb-2 pr-1">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center py-4 text-center">
                        <MessageCircleHeart className="mb-2 h-8 w-8 text-gray-200 dark:text-gray-600" strokeWidth={1.5} />
                        <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet. Start the conversation!</p>
                      </div>
                    ) : (
                      items.map((c) => {
                        const cAuthor = isAnonymousTrue(c)
                          ? { username: "Anonymous User", avatar_url: "/anonymous-avatar.jpg" }
                          : c.author || { username: "Unknown", avatar_url: "/profile-picture.png" };
                        const isCommentEditing = editingCommentId === c.id;
                        const busy = commentActionId === c.id;
                        return (
                          <div key={c.id} className="flex items-start gap-3">
                            <img
                              src={resolveAsset(cAuthor.avatar_url)}
                              alt={cAuthor.username}
                              className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-gray-100 dark:ring-slate-700"
                            />
                            <div className="min-w-0 flex-1">
                              {isCommentEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    className="input py-1.5 text-sm"
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    maxLength={2000}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEditComment(c.id);
                                      if (e.key === "Escape") setEditingCommentId(null);
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveEditComment(c.id)}
                                      disabled={busy}
                                      className="text-xs font-semibold text-blue-600 hover:underline dark:text-sky-400"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      disabled={busy}
                                      className="text-xs font-semibold text-gray-500 hover:underline dark:text-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="group min-w-0 rounded-2xl rounded-tl-md bg-gray-50 dark:bg-slate-800/60 px-3.5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                      {cAuthor.username}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                      {timeAgo(c.created_at)}
                                      {c.updated_at ? " (edited)" : ""}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 break-words text-sm text-gray-700 dark:text-gray-200">{c.text}</p>
                                </div>
                              )}

                              {!isCommentEditing && (
                                <div className="mt-1 flex items-center gap-3 pl-1">
                                  <button
                                    onClick={() => likeComment(c.id)}
                                    disabled={busy}
                                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                      c.liked_by_current_user
                                        ? "text-rose-500"
                                        : "text-gray-400 hover:text-rose-500 dark:text-gray-500"
                                    }`}
                                  >
                                    <Heart className={`h-3.5 w-3.5 ${c.liked_by_current_user ? "fill-rose-500" : ""}`} />
                                    {c.likes_count > 0 && c.likes_count}
                                  </button>
                                  {c.is_owner && (
                                    <>
                                      <button
                                        onClick={() => startEditComment(c)}
                                        className="text-xs font-medium text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-sky-400"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deleteComment(c.id)}
                                        disabled={busy}
                                        className="text-xs font-medium text-gray-400 hover:text-rose-500 dark:text-gray-500"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        className="input pr-11"
                        placeholder={isLoggedIn ? "Write a comment..." : "Login to comment"}
                        value={commentInputs?.[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((s) => ({ ...(s || {}), [post.id]: e.target.value }))
                        }
                        disabled={!isLoggedIn || commentSubmitting?.[post.id]}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitComment(post.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => (isLoggedIn ? submitComment(post.id) : navigate("/login"))}
                        disabled={!isLoggedIn || commentSubmitting?.[post.id]}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-40"
                        title="Send"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {commentsData.more && !commentsData.loading && (
                    <div className="mt-2 text-center">
                      <button
                        className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
                        onClick={() => fetchComments(post.id, true)}
                      >
                        Load more comments
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmingDelete}
        title="Delete this post?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ConfirmDialog
        isOpen={confirmingBlock}
        title={`Block ${author.username}?`}
        message="You won't see their posts anymore. You can unblock them later from Settings."
        confirmLabel="Block"
        loading={blocking}
        onConfirm={handleBlock}
        onCancel={() => setConfirmingBlock(false)}
      />

      <ReportDialog
        isOpen={showReport}
        title="Report this post"
        loading={reporting}
        onSubmit={submitReport}
        onCancel={() => setShowReport(false)}
      />
    </motion.article>
  );
}
