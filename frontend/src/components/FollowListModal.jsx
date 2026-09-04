import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { API_BASE, resolveAsset } from "../utils/helpers";

export default function FollowListModal({ username, kind, isOpen, onClose }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/follow/${username}/${kind}?limit=50`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [isOpen, username, kind]);

  const goToUser = (u) => {
    onClose();
    navigate(`/user/${u.username}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-slate-700">
              <h3 className="text-lg font-bold capitalize text-gray-900 dark:text-gray-50">{kind}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400 dark:text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : users.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                  {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
                </p>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => goToUser(u)}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  >
                    <img src={resolveAsset(u.avatar_url)} alt={u.username} className="h-10 w-10 rounded-full object-cover" />
                    <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{u.username}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
