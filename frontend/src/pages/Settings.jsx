import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Save, User, Mail, PenLine, CheckCircle2 } from "lucide-react";
import useAuth from "../utils/useAuth";
import { API_BASE, getAuthToken, resolveAsset } from "../utils/helpers";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser } = useAuth() || {};
  const [username, setUsername] = useState(authUser?.username ?? "");
  const [email, setEmail] = useState(authUser?.email ?? "");
  const [bio, setBio] = useState(authUser?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const token = getAuthToken();

  useEffect(() => {
    setUsername(authUser?.username ?? "");
    setEmail(authUser?.email ?? "");
    setBio(authUser?.bio ?? "");
    setPreviewUrl(authUser?.avatar_url ? resolveAsset(authUser.avatar_url) : null);
  }, [authUser]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const formData = new FormData();
      if (username && username !== authUser?.username) formData.append("username", username);
      if (email && email !== authUser?.email) formData.append("email", email);
      if (bio !== undefined) formData.append("bio", bio);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await fetch(`${API_BASE}/auth/update`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Update failed" }));
        throw new Error(errData.detail || "Failed to update settings");
      }

      const updatedUser = await res.json();
      if (typeof setAuthUser === "function") setAuthUser(updatedUser);
      setMsg("Settings updated successfully!");
      setAvatarFile(null);
    } catch (error) {
      console.error("Settings update error:", error);
      setErr(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page max-w-2xl">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage your profile and preferences</p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <form onSubmit={onSubmit} className="space-y-6 p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="avatar preview"
                  className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl ring-2 ring-blue-100 dark:ring-slate-700"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-5xl font-bold text-white shadow-xl ring-2 ring-blue-100 dark:ring-slate-700">
                  {username?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-md ring-1 ring-gray-200 dark:ring-slate-700 transition-all hover:bg-blue-50 dark:hover:bg-blue-500/10">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Click the camera icon to change your avatar</p>
          </div>

          {/* Username */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
              <User className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="Your username"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="input cursor-not-allowed bg-gray-50 dark:bg-slate-800/60 text-gray-400 dark:text-gray-500"
              placeholder="your.email@example.com"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Email cannot be changed.</p>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
              <PenLine className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Bio
            </label>
            <textarea
              value={bio || ""}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Messages */}
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {msg}
            </motion.div>
          )}
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
            >
              {err}
            </motion.div>
          )}

          <div className="flex items-center gap-3 border-t border-gray-100 dark:border-slate-700 pt-5">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
            <button type="button" onClick={() => navigate("/")} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
