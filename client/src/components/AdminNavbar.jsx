import React from "react";
import { NavLink } from "react-router-dom";
import Icon from "./ui/Icon";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "grid" },
  { label: "Movies", path: "/admin/movies", icon: "film" },
  { label: "Showtimes", path: "/admin/shows", icon: "calendar" },
  { label: "Snacks", path: "/admin/snacks", icon: "popcorn" },
  { label: "Parking", path: "/admin/parking", icon: "car" },
  { label: "Analytics", path: "/admin/analytics", icon: "chart" },
  { label: "Scan tickets", path: "/admin/scan", icon: "qr" },
  { label: "IoT console", path: "/admin/iot", icon: "settings" },
];

/** Section tabs shown at the top of every admin page. */
export default function AdminNavbar() {
  return (
    <div className="sticky top-16 z-30 border-b border-white/[0.07] bg-ink-900/95 backdrop-blur-xl">
      <nav className="container-page flex items-center gap-4" aria-label="Admin sections">
        <span className="hidden shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400 md:flex">
          <Icon name="settings" className="h-4 w-4" /> Admin
        </span>
        <div className="scroll-row -mx-4 flex-1 gap-1 px-4 py-2 sm:mx-0 sm:px-0">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-gold-500/15 text-gold-400"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`
              }
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
