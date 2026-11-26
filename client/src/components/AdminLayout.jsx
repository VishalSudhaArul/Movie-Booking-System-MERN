import React from "react";
import AdminNavbar from "./AdminNavbar";

/**
 * Page shell for the admin workspace: the section bar, then content at the
 * standard page width and rhythm. Pages render a <PageHeader> first; a page
 * that needs a narrower column (e.g. Scan tickets) wraps its own content.
 */
export default function AdminLayout({ children, className = "" }) {
  return (
    <main id="main" className="min-h-screen text-fg">
      <AdminNavbar />
      <div className={`container-page page page-enter ${className}`}>{children}</div>
    </main>
  );
}
