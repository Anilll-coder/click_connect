export const API_BASE = "https://click-connect-4h1o.onrender.com";

export function getAuthToken() {
  return localStorage.getItem("cc_token");
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

export function resolveAsset(url) {
  if (!url) return "/profile-picture.png";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/static")) return `${API_BASE}${url}`;
  return url;
}

export function timeAgo(iso) {
  if (!iso) return "";
  let dateStr = iso;
  if (!dateStr.endsWith("Z") && !dateStr.includes("+")) dateStr += "Z";
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isAnonymousTrue(post) {
  if (!post) return false;
  const v = post?.is_anonymous;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
}
