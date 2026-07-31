import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

const CATEGORY_STYLES = {
  Balcony: {
    bg: "bg-[#1E1B10] border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:bg-amber-500/20",
    selected: "bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-white text-gray-950 font-black shadow-xl shadow-amber-500/40 scale-110",
    booked: "bg-gray-900 border border-gray-800 text-gray-700 cursor-not-allowed opacity-30",
    badge: "bg-amber-950/80 border border-amber-500/60 text-amber-300",
    icon: "👑",
    name: "VIP Recliner Balcony",
  },
  "First Class": {
    bg: "bg-[#101726] border border-blue-500/40 text-blue-300 hover:border-blue-400 hover:bg-blue-500/20",
    selected: "bg-gradient-to-tr from-blue-600 to-cyan-400 border-2 border-white text-white font-black shadow-xl shadow-blue-500/40 scale-110",
    booked: "bg-gray-900 border border-gray-800 text-gray-700 cursor-not-allowed opacity-30",
    badge: "bg-blue-950/80 border border-blue-500/60 text-blue-300",
    icon: "⭐",
    name: "Prime Lounge",
  },
  "Second Class": {
    bg: "bg-[#0F1E19] border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20",
    selected: "bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-white text-white font-black shadow-xl shadow-emerald-500/40 scale-110",
    booked: "bg-gray-900 border border-gray-800 text-gray-700 cursor-not-allowed opacity-30",
    badge: "bg-emerald-950/80 border border-emerald-500/60 text-emerald-300",
    icon: "🎟️",
    name: "Classic Seating",
  },
};

export default function Seats() {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const { data } = await API.get(`/api/shows/single/${showId}`);
        setShow(data);
      } catch {
        setError("Failed to load seat data. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [showId]);

  const toggleSeat = (seat) => {
    if (seat.isBooked) return;
    setSelectedSeats((prev) =>
      prev.includes(seat.seatNumber)
        ? prev.filter((s) => s !== seat.seatNumber)
        : [...prev, seat.seatNumber]
    );
  };

  /* Auto contiguous seat selector */
  const autoSelectSeats = (count) => {
    if (!show) return;
    const available = show.seats.filter((s) => !s.isBooked).map((s) => s.seatNumber);
    if (available.length >= count) {
      setSelectedSeats(available.slice(0, count));
    }
  };

  const calculateSubtotal = () => {
    if (!show) return 0;
    return show.seats
      .filter((s) => selectedSeats.includes(s.seatNumber))
      .reduce((acc, s) => acc + s.price, 0);
  };

  const applyCoupon = () => {
    if (!couponCode.trim()) return;
    if (couponCode.toUpperCase() === "CINE50") {
      setDiscount(50);
      setCouponMsg("₹50 Discount Applied! 🎉");
    } else if (couponCode.toUpperCase() === "FIRST20") {
      const disc = Math.round(calculateSubtotal() * 0.2);
      setDiscount(disc);
      setCouponMsg(`20% Off (₹${disc}) Applied! 🎉`);
    } else {
      setDiscount(0);
      setCouponMsg("Invalid coupon code. Try CINE50 or FIRST20");
    }
  };

  const calculateFinalTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - discount);
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) return;
    navigate(`/addons/${showId}`, {
      state: { selectedSeats, totalPrice: calculateFinalTotal(), show },
    });
  };

  const groupByCategory = () => {
    if (!show) return {};
    return show.seats.reduce((acc, seat) => {
      if (!acc[seat.category]) acc[seat.category] = [];
      acc[seat.category].push(seat);
      return acc;
    }, {});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060A] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto shadow-2xl shadow-red-600/50" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Initializing Dolby Atmos 3D Seat Map...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06060A] text-white flex items-center justify-center p-4">
        <div className="bg-red-950/60 border border-red-800 text-red-300 rounded-3xl p-8 text-center max-w-md shadow-2xl space-y-4">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-2xl transition"
          >
            Go Back to Shows
          </button>
        </div>
      </div>
    );
  }

  const grouped = groupByCategory();
  const categoriesList = ["All", ...Object.keys(grouped)];

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-44 relative overflow-hidden">
      
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* 🎬 HEADER */}
      <div className="bg-[#0A0A10]/90 backdrop-blur-2xl border-b border-gray-800/80 py-5 px-4 md:px-8 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                IMAX 4D & Dolby Atmos
              </span>
              <span className="text-[10px] text-gray-400 font-mono">ID: {showId.slice(-6)}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white mt-1 flex items-center gap-2">
              <span>{show?.theatre} Multiplex</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              📅 <span className="text-white font-bold">{show?.date}</span> &nbsp;|&nbsp; ⏰ <span className="text-white font-bold">{show?.time}</span>
            </p>
          </div>

          {/* Quick Seat Selector Chips */}
          <div className="flex items-center gap-2 bg-gray-950 p-2 rounded-2xl border border-gray-800/80 shadow-inner">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase px-2 hidden sm:inline">
              Smart Select:
            </span>
            <button
              onClick={() => autoSelectSeats(1)}
              className="bg-gray-900 hover:bg-red-950 border border-gray-800 hover:border-red-800 text-gray-200 hover:text-red-400 font-bold text-xs px-3 py-1.5 rounded-xl transition"
            >
              1 Solo
            </button>
            <button
              onClick={() => autoSelectSeats(2)}
              className="bg-gray-900 hover:bg-red-950 border border-gray-800 hover:border-red-800 text-gray-200 hover:text-red-400 font-bold text-xs px-3 py-1.5 rounded-xl transition"
            >
              👫 Couple (2)
            </button>
            <button
              onClick={() => autoSelectSeats(4)}
              className="bg-gray-900 hover:bg-red-950 border border-gray-800 hover:border-red-800 text-gray-200 hover:text-red-400 font-bold text-xs px-3 py-1.5 rounded-xl transition"
            >
              👨‍👩‍👧‍👦 Family (4)
            </button>
          </div>

        </div>
      </div>

      {/* 🍿 3D CURVED CINEMA SCREEN DISPLAY WITH PROJECTION RAYS */}
      <div className="max-w-4xl mx-auto mt-8 mb-12 px-4">
        <div className="relative text-center">
          {/* Glowing Projector Beam Rays */}
          <div className="w-full h-24 bg-gradient-to-b from-red-500/25 via-red-500/5 to-transparent rounded-t-[100%] blur-md pointer-events-none" />

          {/* Curved IMAX Silver Screen Bar */}
          <div className="relative -mt-10 h-5 bg-gradient-to-r from-gray-600 via-white to-gray-600 rounded-full shadow-[0_12px_50px_rgba(255,255,255,0.5)] border border-white/30 transform -perspective-500 rotate-x-12 flex items-center justify-center">
            <span className="text-[9px] font-black text-gray-900 tracking-[0.4em] uppercase">
              IMAX CURVED SILVER SCREEN
            </span>
          </div>

          <p className="text-[10px] text-gray-500 font-extrabold tracking-[0.3em] uppercase mt-3">
            ✨ ALL EYES THIS WAY ✨
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="max-w-3xl mx-auto px-4 mb-8 flex items-center justify-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              activeCategoryFilter === cat
                ? "bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-600/30"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {cat === "All" ? "All Seat Categories" : cat}
          </button>
        ))}
      </div>

      {/* 💺 SEAT LAYOUT GRID BY CATEGORY */}
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        {Object.entries(grouped)
          .filter(([cat]) => activeCategoryFilter === "All" || activeCategoryFilter === cat)
          .map(([category, seats]) => {
            const style = CATEGORY_STYLES[category] || CATEGORY_STYLES["Second Class"];

            return (
              <div
                key={category}
                className="bg-[#0A0A10]/70 border border-gray-800/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-800/80">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">{style.name}</h3>
                      <p className="text-[11px] text-gray-400">
                        ₹{seats[0]?.price} per seat &nbsp;•&nbsp; Prime Surround Sound
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${style.badge}`}>
                    {seats.filter((s) => !s.isBooked).length} Seats Left
                  </span>
                </div>

                {/* Seat Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3 justify-items-center">
                  {seats.map((seat) => {
                    const isSelected = selectedSeats.includes(seat.seatNumber);
                    let cls = `relative group w-11 h-11 rounded-2xl text-xs font-black flex flex-col items-center justify-center transition-all duration-200 select-none shadow-md `;

                    if (seat.isBooked) {
                      cls += style.booked;
                    } else if (isSelected) {
                      cls += style.selected;
                    } else {
                      cls += style.bg;
                    }

                    return (
                      <button
                        key={seat.seatNumber}
                        onClick={() => toggleSeat(seat)}
                        onMouseEnter={() => setHoveredSeat(seat)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        disabled={seat.isBooked}
                        className={cls}
                      >
                        {/* Seat Armrest Graphic Icon */}
                        <div className="w-6 h-1.5 bg-current opacity-30 rounded-t-sm mb-0.5" />
                        <span>{seat.seatNumber}</span>
                      </button>
                    );
                  })}
                </div>

              </div>
            );
          })}
      </div>

      {/* 📌 LEGEND & HOVER DETAILS CARD */}
      <div className="max-w-2xl mx-auto px-4 mt-10 space-y-4">
        
        {/* Live Hover Seat Info */}
        {hoveredSeat && (
          <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-3.5 text-center text-xs text-white animate-fadeIn">
            <span className="font-bold text-red-400">Seat {hoveredSeat.seatNumber}</span> ({hoveredSeat.category}) — <span className="font-extrabold text-white">₹{hoveredSeat.price}</span> {hoveredSeat.isBooked ? "• ❌ Booked" : "• ✅ Available for selection"}
          </div>
        )}

        <div className="flex items-center justify-around bg-[#0A0A10]/90 border border-gray-800/80 rounded-2xl p-4 text-xs text-gray-400 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-emerald-500/30 border border-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 border border-white" />
            <span>Selected ({selectedSeats.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-gray-900 border border-gray-800 opacity-40" />
            <span>Booked</span>
          </div>
        </div>
      </div>

      {/* 💳 ULTRA LUXURY CHECKOUT & COUPON DRAWER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#07070D]/95 border-t border-gray-800/90 p-4 md:p-6 backdrop-blur-2xl z-40 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="w-12 h-12 bg-red-600/15 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 font-black text-2xl shadow-lg">
              🎟️
            </div>
            <div>
              <p className="text-xs text-gray-400">
                Selected ({selectedSeats.length}):{" "}
                <span className="text-white font-bold">
                  {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}
                </span>
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-2xl font-black text-white">
                  ₹{calculateFinalTotal()}
                </span>
                {discount > 0 && (
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                    Saved ₹{discount}!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Promo Coupon Input Box */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <input
              placeholder="Promo Code (e.g. CINE50)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white rounded-2xl px-4 py-3 text-xs uppercase font-mono focus:outline-none focus:border-red-500 transition w-full lg:w-48"
            />
            <button
              onClick={applyCoupon}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-bold text-xs px-4 py-3 rounded-2xl transition whitespace-nowrap"
            >
              Apply
            </button>
          </div>

          {/* Action Button */}
          <button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0}
            className="w-full lg:w-auto bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 disabled:opacity-40 text-white font-extrabold px-9 py-4 rounded-2xl transition shadow-xl shadow-red-600/30 text-sm flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {selectedSeats.length === 0
              ? "Select Seats to Proceed"
              : `Proceed to F&B Addons (₹${calculateFinalTotal()}) →`}
          </button>

        </div>

        {couponMsg && (
          <p className="text-center text-xs text-emerald-400 font-bold mt-2">{couponMsg}</p>
        )}
      </div>

    </div>
  );
}
