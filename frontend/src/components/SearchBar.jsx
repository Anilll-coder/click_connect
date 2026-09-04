import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, FileText, Loader2 } from "lucide-react";
import { API_BASE, resolveAsset } from "../utils/helpers";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export default function SearchBar({ autoFocus = false, onNavigate }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.length < MIN_QUERY_LENGTH) {
      setUsers([]);
      setPosts([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const [uRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/search/users?q=${encodeURIComponent(term)}&limit=5`),
          fetch(`${API_BASE}/search/posts?q=${encodeURIComponent(term)}&limit=5`),
        ]);
        if (requestId !== requestIdRef.current) return; // a newer request superseded this one
        const [uData, pData] = await Promise.all([
          uRes.ok ? uRes.json() : [],
          pRes.ok ? pRes.json() : [],
        ]);
        setUsers(Array.isArray(uData) ? uData : []);
        setPosts(Array.isArray(pData) ? pData : []);
      } catch (err) {
        console.error("search error:", err);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const clear = () => {
    setQuery("");
    setUsers([]);
    setPosts([]);
  };

  const goToUser = (username) => {
    setOpen(false);
    clear();
    navigate(`/user/${username}`);
    onNavigate?.();
  };

  const goToPost = (id) => {
    setOpen(false);
    clear();
    navigate(`/post/${id}`);
    onNavigate?.();
  };

  const term = query.trim();
  const hasResults = users.length > 0 || posts.length > 0;
  const showPanel = open && term.length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          placeholder="Search people and posts..."
          aria-label="Search people and posts"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm outline-none transition-all placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-slate-800 dark:focus:ring-sky-500/20"
        />
        {query && (
          <button
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400 dark:text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            ) : !hasResults ? (
              <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                No results for "{term}"
              </div>
            ) : (
              <>
                {users.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      People
                    </p>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => goToUser(u.username)}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      >
                        <img
                          src={resolveAsset(u.avatar_url)}
                          alt={u.username}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {u.username}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {posts.length > 0 && (
                  <div>
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Posts
                    </p>
                    {posts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => goToPost(p.id)}
                        className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-sky-400">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                            {p.body}
                          </span>
                          {p.author?.username && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">by {p.author.username}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
