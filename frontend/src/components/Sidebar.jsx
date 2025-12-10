import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { id: "/", label: "Home", icon: "/icons/home.png" },
  { id: "/myposts", label: "My_Posts", icon: "/icons/more.png" },
  { id: "/bot", label: "ChatBot", icon: "/icons/bot.gif" },
  { id: "/anonymous", label: "Anonymous", icon: "/icons/hacker.gif" },
  { id: "/notifications", label: "Notifications", icon: "/icons/bell.png" },
  { id: "/settings", label: "Settings", icon: "/icons/settings.png" },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("cc_token");
    if (!token) return;

    async function fetchUnread() {
      try {
        const res = await fetch("http://localhost:8000/notifications/unread-count", {
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
    // Optional: Poll every minute
    const interval = setInterval(fetchUnread, 60000);

    const handleRead = () => setUnreadCount(0);
    window.addEventListener("notificationsRead", handleRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notificationsRead", handleRead);
    };
  }, []);

  const LinkItem = ({ to, label, icon }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive ? "bg-gray-100" : "hover:bg-gray-50"}`
      }
      onClick={() => onClose?.()}
    >
      <div className="p-2 rounded-lg shadow-sm bg-white relative">
        <img src={icon} alt={label} width={20} height={20} />
        {to === "/notifications" && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </div>
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-xs text-gray-400">▸</span>
    </NavLink>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col fixed  top-15 bottom-6 w-fit  h-[90vh] bg-white rounded-2xl shadow-md p-4 z-40">

        <nav className=" flex flex-col px-2 h-full justify-evenly">
          {navItems.map((n) => (
            <NavLink
              key={n.id}
              to={n.id}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive ? "bg-gray-100" : "hover:bg-gray-50"}`
              }
            >
              <div className="p-2 bg-linear-to-br from-white to-gray-50 rounded-lg group-hover:scale-105 transform transition-shadow shadow-sm relative">
                <img src={n.icon} alt={`${n.label} icon`} width={20} height={20} />
                {n.id === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <span className="font-medium">{n.label}</span>
              <span className="ml-auto text-xs text-gray-400">▸</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button onClick={onClose} className="absolute inset-0 w-full h-full" />
          <aside className="fixed top-16 left-0 bottom-0 w-64 bg-white rounded-r-2xl shadow-md p-4 z-50 animate-slideInLeft">
            <nav className="flex flex-col gap-4">
              {navItems.map((n) => <LinkItem key={n.id} to={n.id} label={n.label} icon={n.icon} />)}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
