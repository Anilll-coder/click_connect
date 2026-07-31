import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "./PostCard";

export default function PostModal({
  post,
  onClose,
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
}) {
  useEffect(() => {
    if (!post) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [post, onClose]);

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-md dark:bg-black/60 sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto my-4 w-full max-w-2xl sm:my-10"
          >
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
              insideModal
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
