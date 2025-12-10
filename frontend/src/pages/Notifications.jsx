import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("cc_token");
  const nav = useNavigate();

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
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
      alert("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <svg className="animate-spin h-8 w-8 text-fuchsia-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg text-gray-600 font-medium">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">


      {notifications.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-md border border-gray-100">
          <p className="text-xl text-gray-600 font-medium mb-2">No notifications yet! 📭</p>
          <p className="text-gray-500">You'll see updates here when people interact with your posts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`p-4 rounded-xl shadow-md border transition-all cursor-pointer ${
                notif.is_read
                  ? "bg-white border-gray-100"
                  : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {notif.actor && (
                  <img
                    src={notif.actor.avatar_url ? `${API_BASE}${notif.actor.avatar_url}` : "/default-avatar.png"}
                    alt={notif.actor.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{notif.message}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(() => {
                      let dateStr = notif.created_at;
                      if (dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
                        dateStr += "Z";
                      }
                      return new Date(dateStr).toLocaleString();
                    })()}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
