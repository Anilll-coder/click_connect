import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// --- UI Helper Icons ---
const HeartIcon = ({ className, filled = false }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.933 0-3.535 1.137-4.125 2.548-.59-1.411-2.192-2.548-4.125-2.548C5.099 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
);

// PNG icon components
const CommentIcon = ({ className }) => (
  <img src="/comment.png" alt="Comment" className={className} />
);

const ShareIcon = ({ className }) => (
  <img src="/share.png" alt="Share" className={className} />
);

const DotsIcon = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm8.25 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm7.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"
      clipRule="evenodd"
    />
  </svg>
);

const MaskHappyIcon = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M6.346 1.834a.75.75 0 0 1 1.06 0l1.25 1.25c.414.414.643.98.643 1.57v.344c0 .285.114.558.314.758l.732.732c.2.2.473.314.758.314h.344c.59 0 1.156.229 1.57.643l1.25 1.25a.75.75 0 0 1 0 1.06l-1.25 1.25c-.414.414-.643.98-.643 1.57v.344c0 .285-.114.558-.314.758l-.732.732c-.2.2-.473.314-.758.314h-.344c-.59 0-1.156.229-1.57-.643l-1.25-1.25a.75.75 0 0 1-1.06 0l-1.25 1.25c-.414.414-.643.98-.643 1.57v.344c0 .285.114.558.314.758l.732.732c.2.2.473.314.758.314h.344c.59 0 1.156-.229 1.57-.643l1.25-1.25a.75.75 0 0 1 1.06 0l1.25 1.25c.414.414.643.98.643 1.57v.344c0 .285-.114.558-.314.758l-.732.732c-.2.2-.473.314-.758.314h-.344c-.59 0-1.156-.229-1.57-.643l-1.25-1.25Z"
      clipRule="evenodd"
    />
  </svg>
);

// Utility: format time
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

function IconButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"
      } ${className}`}
    >
      {children}
    </button>
  );
}

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


// -----------------------------
// MEDIA CAROUSEL
// -----------------------------
function MediaGrid({ media }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!media?.length) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const currentMedia = media[currentIndex];

  return (
    <div className="relative mt-3 flex justify-center">
      {/* Main Image Container - Half Width, Centered, Reduced Height */}
      <div className="relative w-1/2 rounded-lg overflow-hidden bg-gray-100" style={{ height: 250 }}>
        {currentMedia.media_type === "video" ? (
          <video className="w-full h-full object-cover" controls src={currentMedia.url} />
        ) : (
          <img src={currentMedia.url} className="w-full h-full object-cover" alt="" />
        )}
        
        {/* Navigation Arrows - Only show if more than 1 image */}
        {media.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Next Button */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? "bg-white w-6" : "bg-white/50"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Confetti Component
const ConfettiParticles = () => {
  const particles = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: Math.random() * 0.5 + 0.5,
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)]
          }}
        />
      ))}
    </div>
  );
};

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
  setCommentInputs 
}) {
  const isAnon = isAnonymousTrue(post);
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const author = isAnon
    ? { username: "Anonymous User", avatar_url: "/anonymous-avatar.jpg" }
    : post.author || { username: "Unknown", avatar_url: "/profile-picture.png" };

  const commentsData = commentsMap[post.id] || { items: [], loading: false, more: false, skip: 0 };
  const items = commentsData.items || [];

  const handleUserClick = () => {
    if (!isAnon && author.username && author.username !== "Unknown") {
      navigate(`/user/${author.username}`);
    }
  };

  const handleLike = () => {
    if (!isLoggedIn) return;
    
    if (!post.liked_by_current_user) {
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
      const textarea = document.createElement('textarea');
      textarea.value = postUrl;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
      document.body.removeChild(textarea);
    }
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  return (
    <article className="bg-white p-5 rounded-xl shadow-md border border-gray-100 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img 
            src={isAnon ? author.avatar_url : (author.avatar_url.startsWith("http") ? author.avatar_url : "http://localhost:8000" + author.avatar_url)} 
            className={`w-10 h-10 rounded-full object-cover ${!isAnon ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}`}
            alt={author.username}
            onClick={handleUserClick}
          />
          <div>
            <p 
              className={`font-semibold text-gray-800 flex items-center gap-1 ${!isAnon ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
              onClick={handleUserClick}
            >
              {author.username}
              {isAnon && <MaskHappyIcon className="w-4 h-4 text-gray-500" />}
            </p>
            <p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>

        <IconButton>
          <DotsIcon className="w-5 h-5 text-gray-500" />
        </IconButton>
      </div>

      <p className="text-gray-800 mb-4">{post.body}</p>

      <MediaGrid media={post.media} />

      {/* LIKE / COMMENT / SHARE */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 relative">
        {/* LIKE BUTTON */}
        <div className="relative">
          <IconButton
            onClick={handleLike}
            className={`transition-all duration-200 ${post.liked_by_current_user ? "text-rose-500 scale-110" : "text-gray-600"}`}
            disabled={!isLoggedIn}
          >
            <motion.div
                whileTap={{ scale: 0.8 }}
                animate={post.liked_by_current_user ? { scale: [1, 1.2, 1] } : {}}
            >
                <HeartIcon className="w-5 h-5" filled={post.liked_by_current_user} />
            </motion.div>
            <span>{post.likes_count || ""}</span>
          </IconButton>
          {showConfetti && <ConfettiParticles />}
        </div>

        {/* COMMENT */}
        <IconButton onClick={() => openComments(post.id)}>
          <CommentIcon className="w-5 h-5" />
          <span>{post.comments_count || ""}</span>
        </IconButton>

        {/* SHARE */}
        <IconButton onClick={handleShare}>
          <ShareIcon className="w-5 h-5" />
        </IconButton>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
        >
          Link copied to clipboard!
        </motion.div>
      )}

      {/* COMMENTS PANEL */}
      {openCommentsFor === post.id && (
        <div className="mt-4 border-t pt-4">
          {commentsData.loading ? (
            <p className="text-sm text-gray-500">Loading comments...</p>
          ) : (
            <>
              <div className="space-y-3 max-h-48 overflow-auto pb-2">
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500">No comments yet</p>
                ) : (
                  items.map((c) => {
                    const cIsAnonymous = isAnonymousTrue(c);
                    const cAuthor = cIsAnonymous ? { username: "Anonymous User", avatar_url: "/anonymous-avatar.jpg" } : (c.author || { username: "Unknown", avatar_url: "/default-avatar.png" });

                    return (
                      <div key={c.id} className="flex gap-3 items-start">
                        <img src={cIsAnonymous ? cAuthor.avatar_url : "http://localhost:8000"+cAuthor.avatar_url} alt={cAuthor.username} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="text-sm font-semibold">{cAuthor.username}</div>
                          <div className="text-sm text-gray-800">{c.text}</div>
                          <div className="text-xs text-gray-400">{timeAgo(c.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border px-3 py-2"
                  placeholder={isLoggedIn ? "Write a comment..." : "Login to comment"}
                  value={commentInputs[post.id] || ""}
                  onChange={(e) => setCommentInputs((s) => ({ ...(s || {}), [post.id]: e.target.value }))}
                  disabled={!isLoggedIn || commentSubmitting[post.id]}
                />
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  onClick={() => submitComment(post.id)}
                  disabled={!isLoggedIn || commentSubmitting[post.id]}
                >
                  {commentSubmitting[post.id] ? "Sending..." : "Send"}
                </button>
              </div>

              {commentsData.more && !commentsData.loading && (
                <div className="mt-2 text-center">
                  <button className="text-sm text-gray-600 underline" onClick={() => fetchComments(post.id, true)}>
                    Load more comments
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
