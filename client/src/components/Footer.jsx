import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="bg-[#08080C] border-t border-gray-800/80 text-gray-400 pt-16 pb-12 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-red-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 text-white font-extrabold text-2xl tracking-tight">
              <span className="text-3xl bg-red-600 text-white p-2 rounded-2xl shadow-lg shadow-red-600/30">🎬</span>
              <span>CineBook <span className="text-red-500 text-xs font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">VIP</span></span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Discover the latest blockbusters, reserve premium recliner seats, and order delicious snacks with real-time seat tracking and instant digital ticket passes.
            </p>
            <div className="flex gap-4 pt-2">
              {['𝕏', '📷', '🎬', '💬', '📱'].map((icon, idx) => (
                <a
                  key={idx}
                  href="#social"
                  onClick={(e) => e.preventDefault()}
                  className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-600 hover:border-red-500 transition duration-300 shadow-md"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wider uppercase text-xs text-gray-300">
              Quick Browse
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-red-400 transition">Home Showcase</Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-red-400 transition">Now Showing Movies</Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-red-400 transition">Upcoming Release Radar</Link>
              </li>
              <li>
                <Link to="/my-bookings" className="hover:text-red-400 transition">My Ticket Wallet</Link>
              </li>
              <li>
                <Link to="/scanner" className="hover:text-red-400 transition">Ticket QR Scanner</Link>
              </li>
            </ul>
          </div>

          {/* Top Genres */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wider uppercase text-xs text-gray-300">
              Popular Genres
            </h4>
            <ul className="space-y-2.5 text-sm">
              {['Action Blockbusters', 'Sci-Fi & Fantasy', 'Heartwarming Drama', 'Romantic Comedy', 'Thriller & Horror'].map((genre, i) => (
                <li key={i}>
                  <Link to="/movies" className="hover:text-red-400 transition flex items-center gap-2">
                    <span className="text-red-500 text-xs">▸</span> {genre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Box */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wider uppercase text-xs text-gray-300">
              VIP Movie Club
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Get secret promo codes, early screening access, and 15% off popcorn combos!
            </p>
            {subscribed ? (
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-bounce">
                <span>🎉</span> You're in! Check your inbox for secret promos.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Enter email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
                />
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-red-600/30"
                >
                  JOIN CLUB FREE ✨
                </button>
              </form>
            )}
          </div>
        </div>

        {/* App Download Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-[#14141d] border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-12 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center text-3xl">
              📲
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Book on the go with CineBook App</h3>
              <p className="text-gray-400 text-xs mt-0.5">Fast one-tap seat selection, offline QR passes, and exclusive app discounts.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("CineBook App is available on iOS App Store!")}
              className="bg-black border border-gray-700 hover:border-gray-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <span>🍏</span> App Store
            </button>
            <button
              onClick={() => alert("CineBook App is available on Google Play Store!")}
              className="bg-black border border-gray-700 hover:border-gray-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <span>🤖</span> Google Play
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-900 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} CineBook Inc. All rights reserved. Designed for ultimate cinema lovers.</p>
          <div className="flex gap-6">
            <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-gray-400 transition">Privacy Policy</a>
            <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-gray-400 transition">Terms of Service</a>
            <a href="#cookies" onClick={(e) => e.preventDefault()} className="hover:text-gray-400 transition">Cookie Preferences</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
