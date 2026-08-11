import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: "⚙️" },
    { label: "Movies", path: "/admin/movies", icon: "🎬" },
    { label: "Showtimes", path: "/admin/shows", icon: "🎭" },
    { label: "Snacks", path: "/admin/snacks", icon: "🍿" },
    { label: "Parking", path: "/admin/parking", icon: "🚗" },
    { label: "Analytics", path: "/admin/analytics", icon: "📊" },
    { label: "QR Scanner", path: "/admin/scan", icon: "🎟️" },
    { label: "IoT Console", path: "/admin/iot", icon: "📡" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-[#09090F]/95 backdrop-blur-xl border-b border-gray-800/90 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 via-red-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                ⚙️
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-base tracking-tight leading-none group-hover:text-amber-400 transition">
                  CineBook Admin
                </span>
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-0.5">
                  Executive Suite
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-block w-px h-5 bg-gray-800" />
            
            <span className="hidden sm:flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SYSTEM ONLINE
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-inner"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/80"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Exit / Return to Site */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/")}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-red-500/40 text-gray-200 hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span className="hidden xs:inline">Return to Main Site</span>
            </button>
          </div>

        </div>

        {/* Sub-nav for mobile/tablet screens */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-3 pt-1 custom-scrollbar border-t border-gray-800/50">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-gray-400 hover:text-white bg-gray-900/60"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
