import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import SpotlightSearch from "./SpotlightSearch";
import Modal from "./ui/Modal";
import Icon from "./ui/Icon";
import Poster from "./Poster";
import { EmptyState } from "./ui/Feedback";
import { useWatchlist } from "../context/WatchlistContext";
import { clearSession, getSession } from "../lib/session";
import { splitGenres } from "../lib/format";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/movies", label: "Movies", icon: "film" },
  { to: "/snacks", label: "Food & Drinks", icon: "popcorn" },
  { to: "/gift-cards", label: "Gift Cards", icon: "gift" },
  { to: "/loyalty", label: "Rewards", icon: "crown" },
];

const CITIES = [
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Delhi NCR", state: "Delhi" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Kochi", state: "Kerala" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Goa", state: "Goa" },
  { name: "Chandigarh", state: "Punjab / Haryana" },
];

export function Logo({ className = "" }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow">
        <Icon name="ticket" className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-white">
        Cine<span className="text-brand-400">Book</span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: watchlistItems, toggle: toggleWatchlist } = useWatchlist();
  const { isLoggedIn, isAdmin, userName } = getSession();

  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(localStorage.getItem("selectedCity") || "Mumbai");
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);

  // Close every overlay when the route changes
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setWatchlistOpen(false);
    setSearchOpen(false);
    setCityOpen(false);
  }, [location.pathname]);

  // Ctrl/Cmd + K opens search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the account dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  // Lock scroll while the mobile drawer is open
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const handleLogout = () => {
    clearSession();
    setUserMenuOpen(false);
    setMenuOpen(false);
    navigate("/login");
  };

  const selectCity = (name) => {
    setSelectedCity(name);
    localStorage.setItem("selectedCity", name);
    setCityOpen(false);
    setCityQuery("");
  };

  const filteredCities = CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(cityQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(cityQuery.toLowerCase())
  );

  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/[0.08] text-white" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-40 w-full border-b transition-colors duration-300 ${
          scrolled ? "border-white/[0.07] bg-ink-950/90 backdrop-blur-xl" : "border-transparent bg-ink-950/70 backdrop-blur-md"
        }`}
      >
        <nav className="container-page flex h-16 items-center justify-between gap-3" aria-label="Main">
          {/* Brand + city */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link to="/" aria-label="CineBook home" className="shrink-0">
              <Logo />
            </Link>
            <button
              onClick={() => setCityOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/[0.05] hover:text-white sm:flex"
              aria-label={`Change city, currently ${selectedCity}`}
            >
              <Icon name="pin" className="h-4 w-4 text-brand-400" />
              <span className="max-w-[110px] truncate">{selectedCity}</span>
              <Icon name="chevronDown" className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.slice(1).map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive || location.pathname.startsWith("/admin")
                      ? "bg-gold-500/15 text-gold-400"
                      : "text-gold-400 hover:bg-gold-500/10"
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Search movies"
            >
              <Icon name="search" className="h-4 w-4" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border border-white/10 bg-white/[0.05] px-1.5 text-[10px] font-semibold text-gray-500 xl:inline">
                Ctrl K
              </kbd>
            </button>

            <button
              onClick={() => setWatchlistOpen(true)}
              className="btn-icon relative hidden sm:inline-flex"
              aria-label={`Watchlist, ${watchlistItems.length} saved`}
            >
              <Icon name="heart" className="h-[18px] w-[18px]" />
              {watchlistItems.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                  {watchlistItems.length}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] pl-1.5 pr-2 transition hover:bg-white/[0.08]"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-label="Account menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                    {initial}
                  </span>
                  <span className="hidden max-w-[90px] truncate text-sm font-medium text-gray-200 md:inline">
                    {userName || "Account"}
                  </span>
                  <Icon name="chevronDown" className="h-3.5 w-3.5 text-gray-500" />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl animate-fadeUp"
                  >
                    <div className="border-b border-white/[0.07] px-4 py-3.5">
                      <p className="truncate text-sm font-semibold text-white">{userName || "CineBook member"}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <Icon name="pin" className="h-3 w-3" /> {selectedCity}
                      </p>
                    </div>
                    <div className="p-1.5">
                      <MenuLink to="/my-bookings" icon="ticket" label="My bookings" />
                      <MenuLink to="/watchlist" icon="heart" label="Watchlist" />
                      <MenuLink to="/loyalty" icon="crown" label="Rewards" />
                      <MenuLink to="/gift-cards" icon="gift" label="Gift cards" />
                      {isAdmin && <MenuLink to="/admin/dashboard" icon="settings" label="Admin console" />}
                    </div>
                    <div className="border-t border-white/[0.07] p-1.5">
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-300 transition hover:bg-brand-500/10"
                      >
                        <Icon name="logout" className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden px-3.5 sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary px-4">
                  <span className="hidden sm:inline">Create account</span>
                  <span className="sm:hidden">Join</span>
                </Link>
              </>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              className="btn-icon lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm animate-fadeIn lg:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMenuOpen(false);
          }}
        >
          <aside
            className="ml-auto flex h-full w-[86%] max-w-sm flex-col border-l border-white/10 bg-ink-900 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
              <Logo />
              <button onClick={() => setMenuOpen(false)} className="btn-icon" aria-label="Close menu">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition ${
                      isActive ? "bg-white/[0.08] text-white" : "text-gray-300 hover:bg-white/[0.05]"
                    }`
                  }
                >
                  <Icon name={link.icon} className="h-5 w-5 text-gray-400" />
                  {link.label}
                </NavLink>
              ))}

              <div className="my-2 border-t border-white/[0.07]" />

              <DrawerButton
                icon="heart"
                label="Watchlist"
                trailing={watchlistItems.length > 0 ? String(watchlistItems.length) : null}
                onClick={() => {
                  setMenuOpen(false);
                  setWatchlistOpen(true);
                }}
              />
              {isLoggedIn && (
                <DrawerButton icon="ticket" label="My bookings" onClick={() => navigate("/my-bookings")} />
              )}
              <DrawerButton
                icon="pin"
                label="City"
                trailing={selectedCity}
                onClick={() => {
                  setMenuOpen(false);
                  setCityOpen(true);
                }}
              />
              {isAdmin && (
                <DrawerButton icon="settings" label="Admin console" onClick={() => navigate("/admin/dashboard")} />
              )}
            </div>

            <div className="border-t border-white/[0.07] p-4">
              {isLoggedIn ? (
                <button onClick={handleLogout} className="btn-danger w-full">
                  <Icon name="logout" className="h-4 w-4" /> Sign out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" className="btn-secondary">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Create account
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── City picker ── */}
      <Modal
        isOpen={cityOpen}
        onClose={() => setCityOpen(false)}
        title="Choose your city"
        subtitle="We'll remember this for your next visit"
      >
        <div className="border-b border-white/[0.07] p-4">
          <div className="relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="Search for a city"
              aria-label="Search for a city"
              className="input pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
          {filteredCities.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-gray-400">No cities match your search.</p>
          )}
          {filteredCities.map((city) => {
            const selected = selectedCity === city.name;
            return (
              <button
                key={city.name}
                onClick={() => selectCity(city.name)}
                aria-pressed={selected}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition ${
                  selected
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-white/[0.07] bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{city.name}</span>
                  <span className="block truncate text-xs text-gray-400">{city.state}</span>
                </span>
                {selected && <Icon name="check" className="h-4 w-4 shrink-0 text-brand-400" />}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* ── Watchlist ── */}
      <Modal
        isOpen={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        title="Your watchlist"
        subtitle={
          watchlistItems.length > 0
            ? `${watchlistItems.length} saved ${watchlistItems.length === 1 ? "movie" : "movies"}`
            : undefined
        }
      >
        <div className="p-4">
          {watchlistItems.length === 0 ? (
            <EmptyState
              icon="heart"
              title={isLoggedIn ? "Nothing saved yet" : "Sign in to use your watchlist"}
              message={
                isLoggedIn
                  ? "Tap the heart on any movie to save it here for later."
                  : "Save movies you want to watch and book them in a tap."
              }
              action={
                <button
                  className="btn-primary"
                  onClick={() => {
                    setWatchlistOpen(false);
                    navigate(isLoggedIn ? "/movies" : "/login");
                  }}
                >
                  {isLoggedIn ? "Browse movies" : "Sign in"}
                </button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {watchlistItems.map((movie) => (
                <li
                  key={movie._id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5"
                >
                  <Poster src={movie.poster} alt="" className="h-16 w-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{movie.title}</p>
                    <p className="truncate text-xs text-gray-400">
                      {splitGenres(movie.genre).slice(0, 3).join(" · ")}
                    </p>
                  </div>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => {
                      setWatchlistOpen(false);
                      navigate(`/movies/${movie._id}`);
                    }}
                  >
                    Book
                  </button>
                  <button
                    className="btn-icon h-8 w-8"
                    onClick={() => toggleWatchlist(movie)}
                    aria-label={`Remove ${movie.title} from watchlist`}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <SpotlightSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-200 transition hover:bg-white/[0.06] hover:text-white"
    >
      <Icon name={icon} className="h-4 w-4 text-gray-400" />
      {label}
    </Link>
  );
}

function DrawerButton({ icon, label, trailing, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/[0.05]"
    >
      <Icon name={icon} className="h-5 w-5 text-gray-400" />
      <span className="flex-1">{label}</span>
      {trailing && <span className="text-xs text-gray-500">{trailing}</span>}
    </button>
  );
}
