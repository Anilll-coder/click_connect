import React, { useEffect, useState } from "react";
import useAuth from "../utils/useAuth";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

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

  const token = localStorage.getItem("cc_token");

  useEffect(() => {
    setUsername(authUser?.username ?? "");
    setEmail(authUser?.email ?? "");
    setBio(authUser?.bio ?? "");
    setPreviewUrl(authUser?.avatar_url ? `${API_BASE}${authUser.avatar_url}` : null);
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
    <div className="w-full max-w-3xl mx-auto px-4 py-6">


      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="avatar preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-md"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-4xl font-bold shadow-md">
                  {username?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <div className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                Change Avatar
              </div>
            </label>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              placeholder="Your username"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
              placeholder="your.email@example.com"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Messages */}
          {msg && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
              {msg}
            </div>
          )}
          {err && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {err}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
