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
} from "lucide-react";
import { resolveAsset, timeAgo, isAnonymousTrue } from "../utils/helpers";

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
function ActionButton({ active, activeClass, onClick, disabled, children }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
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
}) {
  const isAnon = isAnonymousTrue(post);
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

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
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
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
                  : "cursor-pointer ring-blue-100 transition-all hover:ring-blue-300"
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

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-600 dark:text-gray-300"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <button
        className={`block w-full text-left ${onOpen && !insideModal ? "cursor-pointer" : "cursor-default"}`}
        onClick={handleOpenPost}
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 dark:text-gray-100">
          {post.body}
        </p>
      </button>

      <MediaGrid media={post.media} onImageClick={handleOpenPost} />

      {/* Actions */}
      <div className="relative mt-4 flex items-center gap-1 border-t border-gray-100 dark:border-slate-700 pt-2">
        <ActionButton
          active={isLiked}
          activeClass="text-rose-500"
          onClick={handleLike}
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
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
          <span>{post.comments_count || 0}</span>
        </ActionButton>

        <ActionButton onClick={handleShare}>
          <Share2 className="h-5 w-5" strokeWidth={1.8} />
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
                        return (
                          <div key={c.id} className="flex items-start gap-3">
                            <img
                              src={resolveAsset(cAuthor.avatar_url)}
                              alt={cAuthor.username}
                              className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-gray-100 dark:ring-slate-700"
                            />
                            <div className="min-w-0 rounded-2xl rounded-tl-md bg-gray-50 dark:bg-slate-800/60 px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                  {cAuthor.username}
                                </span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                  {timeAgo(c.created_at)}
                                </span>
                              </div>
                              <p className="mt-0.5 break-words text-sm text-gray-700 dark:text-gray-200">{c.text}</p>
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

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-2xl"
          >
            <Share2 className="h-4 w-4 text-emerald-400" />
            Link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
