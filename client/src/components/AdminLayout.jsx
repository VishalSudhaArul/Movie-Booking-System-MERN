import React from "react";
import AdminNavbar from "./AdminNavbar";

/** Page shell for the admin area: section tabs plus a padded content region. */
export default function AdminLayout({ children, className = "" }) {
  return (
    <main id="main" className="min-h-screen text-white">
      <AdminNavbar />
      <div className={`relative px-4 py-6 sm:px-6 md:py-8 lg:px-8 ${className}`}>{children}</div>
    </main>
  );
}
