import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BellRing, Heart, MessageCircle, ChevronRight } from "lucide-react";
import { API_BASE, getAuthToken, resolveAsset, timeAgo } from "../utils/helpers";
import { Loader, EmptyState } from "../components/ui";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = getAuthToken();
  const nav = useNavigate();

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllAsRead() {
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      window.dispatchEvent(new Event("notificationsRead"));
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        nav("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("fetchNotifications error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  }

  function openNotification(notif) {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.post_id) nav(`/post/${notif.post_id}`);
  }

  return (
    <div className="page">
      <header className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Notifications</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">See who's interacting with your posts</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
          <BellRing className="h-5 w-5" />
        </div>
      </header>

      {loading ? (
        <Loader label="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="All caught up"
          message="You'll see updates here when people interact with your posts."
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif, idx) => (
            <motion.button
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => openNotification(notif)}
              className={`card group flex w-full items-center gap-4 p-4 text-left transition-all hover:border-blue-200 dark:hover:border-slate-600 hover:shadow-md ${
                notif.is_read ? "" : "border-blue-100 bg-gradient-to-r from-blue-50/80 to-sky-50/80 dark:border-sky-500/30 dark:from-blue-500/10 dark:to-sky-500/10"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  notif.type === "like"
                    ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                    : "bg-blue-50 text-blue-500 dark:bg-blue-500/10"
                }`}
              >
                {notif.type === "like" ? (
                  <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {notif.actor?.avatar_url && (
                    <img
                      src={resolveAsset(notif.actor.avatar_url)}
                      alt={notif.actor.username}
                      className="h-6 w-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
                    />
                  )}
                  <span className="truncate text-sm text-gray-800 dark:text-gray-100">{notif.message}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{timeAgo(notif.created_at)}</p>
              </div>

              {!notif.is_read && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-400" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
