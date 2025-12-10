import React, { useState } from "react";
import TopBar from "./components/Topbar";
import Sidebar from "./components/Sidebar";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopBar onOpenMenu={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="pt-16 lg:ml-56">  
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <main className="min-h-[calc(100vh-4rem)]  overflow-y-auto py-6">
        {children}
      </main>
    </div>
  </div>
    </div>
  );
}
