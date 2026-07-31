import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Video, User, EyeOff, X, Send, Info } from "lucide-react";
import { API_BASE } from "../utils/helpers";

export default function PostCreator({ onPosted }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const p = [];
    files.forEach((f) => {
      const type = f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : "other";
      const src = URL.createObjectURL(f);
      p.push({ type, src, name: f.name });
    });
    setPreviews(p);

    return () => {
      p.forEach((x) => URL.revokeObjectURL(x.src));
    };
  }, [files]);

  useEffect(() => {
    const locationContent = window.history?.state?.usr?.content;
    if (locationContent && !body) {
      setBody(locationContent);
      setCharCount(locationContent.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFilesChange(e) {
    const chosen = Array.from(e.target.files || []);
    if (!chosen.length) return;
    setFiles((prev) => [...prev, ...chosen]);
    e.target.value = null;
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitPost(e) {
    e.preventDefault();
    setError(null);
    if (!body.trim() && files.length === 0) {
      setError("Write something or attach a file.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("cc_token");
      if (!token) throw new Error("Not authenticated");

      const fd = new FormData();
      fd.append("body", body);
      files.forEach((f) => fd.append("files", f));
      fd.append("is_anonymous", isAnonymous);

      const res = await fetch(`${API_BASE}/posts/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        nav("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || err?.message || "Upload failed");
      }

      const created = await res.json();
      setBody("");
      setFiles([]);
      setPreviews([]);
      setError(null);
      setIsAnonymous(false);
      setCharCount(0);

      if (onPosted) onPosted(created);
      else nav("/");
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page max-w-2xl">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
          {isAnonymous ? "Post Anonymously" : "Create a Post"}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {isAnonymous
            ? "Your identity stays hidden — speak your mind."
            : "Share your thoughts with the community."}
        </p>
      </header>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submitPost}
        className="card overflow-hidden"
      >
        <div className="border-b border-gray-100 dark:border-slate-700 p-5">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setCharCount(e.target.value.length);
            }}
            placeholder={isAnonymous ? "Share something anonymously..." : "What's on your mind?"}
            className="min-h-[140px] w-full resize-none border-none p-0 text-lg leading-relaxed outline-none placeholder-gray-300 dark:placeholder-gray-600"
            maxLength={5000}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{charCount > 0 ? `${charCount}/5000` : ""}</span>
          </div>
        </div>

        {/* Media previews */}
        <AnimatePresence>
          {previews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 p-4"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((p, i) => (
                  <div
                    key={i}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
                  >
                    {p.type === "image" ? (
                      <img src={p.src} alt={p.name} className="h-full w-full object-cover" />
                    ) : p.type === "video" ? (
                      <video src={p.src} className="h-full w-full object-cover" controls />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 dark:bg-slate-700/50 p-2 text-center">
                        <Info className="mb-1 h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <span className="w-full truncate px-1 text-xs text-gray-500 dark:text-gray-400">{p.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/70 text-white shadow-md transition-all hover:bg-rose-500"
                      aria-label="remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-5">
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-rose-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-rose-400"
            >
              {error}
            </motion.p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-sky-400 dark:hover:bg-blue-500/20">
                <ImageIcon className="h-4 w-4" />
                Media
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={onFilesChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isAnonymous
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                    : "bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600/50"
                }`}
              >
                {isAnonymous ? <EyeOff className="h-4 w-4" /> : <User className="h-4 w-4" />}
                {isAnonymous ? "Anonymous On" : "Post as Me"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || (!body.trim() && files.length === 0)}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
