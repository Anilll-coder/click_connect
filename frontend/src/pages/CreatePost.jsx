// src/components/PostCreator.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Assuming you have an icon library or using simple characters/inline SVGs
const PhotoVideoIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.096l4.444-4.444a1.25 1.25 0 0 1 1.768 0l2.502 2.502 3.896-3.896a1.25 1.25 0 0 1 1.768 0l2.502 2.502V6.75a.75.75 0 0 0-.75-.75H3.75a.75.75 0 0 0-.75.75v9.346ZM9.75 9.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clipRule="evenodd" /></svg>;
const UserIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>;
const EyeSlashIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path fillRule="evenodd" d="M1.323 11.411A9.74 9.74 0 0 0 2.23 15C4.693 20.354 10.373 22.5 12 22.5c.348 0 .684-.047 1.008-.13A9.74 9.74 0 0 0 21.77 15c-2.463-5.354-8.143-7.5-9.77-7.5h.001c-.198 0-.394.008-.59.022L12 11.25z" clipRule="evenodd" /></svg>;


const API_BASE = "http://localhost:8000";

export default function PostCreator({ onPosted }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]); // File objects
  const [previews, setPreviews] = useState([]); // {type, src, name}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const nav = useNavigate();
  
  // --- Semi-Backend Logic for Anonymity ---
  const [isAnonymous, setIsAnonymous] = useState(false);
  // -----------------------------------------

  useEffect(() => {
    const p = [];
    files.forEach((f) => {
      const type = f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : "other";
      const src = URL.createObjectURL(f);
      p.push({ type, src, name: f.name });
    });
    setPreviews(p);

    return () => {
      p.forEach((x) => URL.revokeObjectURL(x.src));
    };
  }, [files]);

  function onFilesChange(e) {
    const chosen = Array.from(e.target.files || []);
    if (!chosen.length) return;
    // Optional: filter by allowed mime types on client too
    setFiles((prev) => [...prev, ...chosen]);
    e.target.value = null;
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitPost(e) {
    e.preventDefault();
    setError(null);
    if (!body && files.length === 0) {
      setError("Write something or attach a file.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("cc_token");
      if (!token) throw new Error("Not authenticated");

      const fd = new FormData();
      fd.append("body", body);
      files.forEach((f) => fd.append("files", f));

      // --- Backend Logic Adjustment for Anonymity ---
      // The server will need to check for this field.
      fd.append("is_anonymous", isAnonymous); 
      // ----------------------------------------------

      const res = await fetch(`${API_BASE}/posts/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (res.status === 401) {
        localStorage.removeItem("cc_token");
        nav("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || err?.message || "Upload failed");
      }

      const created = await res.json();

      // reset UI
      setBody("");
      setFiles([]);
      setPreviews([]);
      setError(null);
      setIsAnonymous(false); // Reset anonymity after successful post

      // notify parent to refresh feed
      if (onPosted) onPosted(created);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">Share Your Thoughts 💬</h2>
      <form onSubmit={submitPost} className="space-y-4">
        {/* Textarea Section */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 border-none focus:ring-0 rounded-lg bg-white min-h-[100px] resize-none outline-none text-lg placeholder-gray-400"
        />

        {/* Media Preview Section */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden shadow-sm group border border-gray-300">
                {/* Media rendering logic remains the same */}
                {p.type === "image" ? (
                  <img src={p.src} alt={p.name} className="w-full h-full object-cover" />
                ) : p.type === "video" ? (
                  <video src={p.src} className="w-full h-full object-cover" controls />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 p-2 text-center">
                    <span className="text-sm font-medium text-gray-700">File</span>
                    <span className="text-xs text-gray-500 truncate w-full px-1">{p.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                  aria-label="remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            
          {/* Left side: Attach and Anonymous toggle */}
          <div className="flex items-center gap-3">
            
            {/* Attach Media Button (Styling improved) */}
            <label className="flex items-center gap-2 px-3 py-2 rounded-full bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 cursor-pointer text-sm font-medium transition-colors">
              <PhotoVideoIcon className="w-5 h-5" />
              Media
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={onFilesChange}
                className="hidden"
              />
            </label>
            
            {/* Anonymous Toggle Button (New UI feature) */}
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                isAnonymous
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isAnonymous ? <EyeSlashIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
              {isAnonymous ? "Posting Anonymously" : "Post as Me"}
            </button>
          </div>
          
          {/* Right side: Submit Button */}
          <button
            type="submit"
            disabled={loading || (!body && files.length === 0)}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white font-bold text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}