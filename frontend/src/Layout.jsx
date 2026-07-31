import React, { useState } from "react";
import TopBar from "./components/Topbar";
import Sidebar from "./components/Sidebar";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f7fb] dark:bg-slate-900 text-gray-900 dark:text-gray-50">
      <TopBar onOpenMenu={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="pt-16 lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <main className="min-h-[calc(100vh-6rem)] pb-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
