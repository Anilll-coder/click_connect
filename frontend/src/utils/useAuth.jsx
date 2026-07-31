import { useEffect, useState } from "react";
import { API_BASE } from "./helpers";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function fetchUser() {
    const token = localStorage.getItem("cc_token");
    if (!token) {
      setUser(null);
      setIsLoggedIn(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch user");

      const data = await res.json();
      console.log(data);
      setUser({
        id: data.id,
        email: data.email,
        username: data.username,
        avatar_url: data.avatar_url, 
      });

      setIsLoggedIn(true);
    } catch (err) {
      console.error(err);
      setUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem("cc_token");
    }
  }

  function logout() {
    localStorage.removeItem("cc_token");
    setUser(null);
    setIsLoggedIn(false);
    // Reload the page to reset the application state
    window.location.reload();
  }

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, isLoggedIn, logout };
}
