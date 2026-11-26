import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Navbar";
import useAdminSession from "../lib/adminSession";

const COLUMNS = [
  {
    title: "Movies",
    links: [
      { to: "/movies", label: "Now showing" },
      { to: "/movies?status=soon", label: "Coming soon" },
      { to: "/watchlist", label: "Watchlist" },
    ],
  },
  {
    title: "Experience",
    links: [
      { to: "/snacks", label: "Food & drinks" },
      { to: "/gift-cards", label: "Gift cards" },
      { to: "/loyalty", label: "Rewards" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/my-bookings", label: "My bookings" },
      // Staff-only tools are listed only for staff (the pages are also protected).
      { to: "/scanner", label: "Ticket scanner", staff: true },
      { to: "/admin/dashboard", label: "Admin console", staff: true },
    ],
  },
];

function Footer() {
  // Re-read the session on every navigation so links update after sign-in/out.
  useLocation();
  const { active: isAdmin } = useAdminSession();

  return (
    <footer className="mt-auto border-t border-line bg-ink-950/80">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" aria-hidden="true" />
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link to="/" aria-label="CineBook home" className="inline-block">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
              Book movie tickets, pick the perfect seats and pre-order snacks, all in a few taps.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-300">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links
                  .filter((link) => !link.staff || isAdmin)
                  .map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="text-sm text-gray-400 transition hover:text-brand-300">
                        {link.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-gray-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} CineBook. All rights reserved.</p>
          <p>Ticket prices are inclusive of all taxes.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
