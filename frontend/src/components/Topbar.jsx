import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, PenSquare, Sun } from "lucide-react";
import useAuth from "../utils/useAuth";
import { resolveAsset } from "../utils/helpers";
import { BrandBadge } from "./ui";
import { useTheme } from "../utils/theme";

export default function TopBar({ onOpenMenu, onCloseMenu }) {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="rounded-xl p-2 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <button
            className="flex items-center gap-2.5"
            onClick={() => navigate("/")}
            aria-label="ClickConnect home"
          >
            <BrandBadge />
            <span className="hidden bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:block">
              ClickConnect
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-xl p-2 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:text-gray-50 dark:text-gray-400 dark:hover:bg-slate-700/60 dark:hover:text-gray-100"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {!isLoggedIn ? (
            <button onClick={() => navigate("/login")} className="btn-primary">
              Log in
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/create")}
                className="btn-primary hidden sm:inline-flex"
              >
                <PenSquare className="h-4 w-4" />
                Create Post
              </button>

              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50"
                title="Your profile"
              >
                {user?.avatar_url ? (
                  <img
                    src={resolveAsset(user.avatar_url)}
                    alt={user?.username || "avatar"}
                    className="h-9 w-9 rounded-full border border-gray-200 dark:border-slate-700 object-cover ring-2 ring-white dark:ring-slate-900"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white">
                    {(user?.username || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-gray-700 dark:text-gray-200 md:block">
                  {user?.username}
                </span>
              </button>

              <button
                onClick={() => {
                  onCloseMenu?.();
                  logout();
                }}
                className="rounded-xl p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
