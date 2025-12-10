import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../utils/useAuth";
import "./css/home.css"

export default function TopBar({ onOpenMenu, onCloseMenu }) {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const prefix="http://localhost:8000";
  const avatar_url=prefix+user?.avatar_url;
  const Avatar = ({ username }) => {
    const letter = (username && username[0]?.toUpperCase()) || "U";
    return (
      <div
        className="w-9 h-9 rounded-full bg-linear-to-br from-rose-500 to-pink-400 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer"
        title={username || "User"}
      >
        {letter}
      </div>
    );
  };


  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMenu}
              aria-label="Open menu"
              className="p-2 rounded-md hover:bg-gray-100 transition lg:hidden"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-rose-500 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
                CC
              </div>
              <span className="font-semibold text-lg">ClickConnect</span>
            </div>

           
          </div>

          <div className="flex  items-center gap-3">
            {!isLoggedIn ? (
              <button
                className="btn-grad text-[15px]"
                onClick={() => navigate("/login")}
              >
                Log in
              </button>
            ) : (
               
             <div className="flex gap-3">
               <button
                onClick={() => {
                  onCloseMenu?.();
                  logout();
                }}
                className="ml-4 px-3 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
              >
                Logout
              </button>
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => navigate("/settings")}
              >
                <img
                  src={(avatar_url!==prefix)?avatar_url:"/profile-picture.png"}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover border border-gray-300"
                />
                <span className="font-medium hidden sm:block">{user?.username}</span>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
