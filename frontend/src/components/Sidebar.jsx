import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  FileText,
  Bot,
  Ghost,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { API_BASE, getAuthToken } from "../utils/helpers";

const navItems = [
  { id: "/", label: "Home", icon: Home },
  { id: "/myposts", label: "My Posts", icon: FileText },
  { id: "/create", label: "Create Post", icon: Bot },
  { id: "/anonymous", label: "Anonymous", icon: Ghost },
  { id: "/bot", label: "AI Chatbot", icon: Bot },
  { id: "/notifications", label: "Notifications", icon: Bell },
  { id: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ to, label, icon: Icon, badge = 0, onClick, onDesktop = false }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? "bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 dark:from-slate-800 dark:to-slate-700 dark:text-sky-400"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:text-gray-50"
        }`
      }
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all ${
          onDesktop
            ? "bg-white dark:bg-slate-800 shadow-sm ring-1 ring-gray-100 dark:ring-slate-700 group-hover:scale-105"
            : ""
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className={onDesktop ? "flex-1" : ""}>{label}</span>
      {badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
      {onDesktop && (
        <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    async function fetchUnread() {
      try {
        const res = await fetch(`${API_BASE}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);

    const handleRead = () => setUnreadCount(0);
    window.addEventListener("notificationsRead", handleRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notificationsRead", handleRead);
    };
  }, []);

  return (
    <>
      <aside className="fixed bottom-6 left-4 top-20 z-40 hidden w-56 flex-col justify-center rounded-2xl border border-gray-100 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-3 shadow-sm backdrop-blur lg:flex">
        <nav className="flex flex-col gap-1">
          {navItems.map((n) => (
            <NavItem
              key={n.id}
              to={n.id}
              label={n.label}
              icon={n.icon}
              badge={n.id === "/notifications" ? unreadCount : 0}
              onDesktop
            />
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            onClick={onClose}
            className="absolute inset-0 h-full w-full bg-gray-900/40 backdrop-blur-sm"
            aria-label="Close menu"
          />
          <aside className="animate-slide-in-left fixed bottom-0 left-0 top-0 flex w-72 flex-col border-r border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 bg-clip-text text-lg font-extrabold text-transparent">
                ClickConnect
              </span>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-700 dark:text-gray-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((n) => (
                <NavItem
                  key={n.id}
                  to={n.id}
                  label={n.label}
                  icon={n.icon}
                  badge={n.id === "/notifications" ? unreadCount : 0}
                  onClick={onClose}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
