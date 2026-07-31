import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

const CATEGORY_STYLES = {
  Balcony: {
    bg: "bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/40",
    selected: "bg-amber-500 border-2 border-amber-300 text-black font-extrabold shadow-lg shadow-amber-500/50 scale-110",
    booked: "bg-gray-800/60 border border-gray-700/50 text-gray-600 cursor-not-allowed opacity-40",
    badge: "bg-amber-950/80 border border-amber-700 text-amber-400",
  },
  "First Class": {
    bg: "bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/40",
    selected: "bg-blue-500 border-2 border-blue-300 text-white font-extrabold shadow-lg shadow-blue-500/50 scale-110",
    booked: "bg-gray-800/60 border border-gray-700/50 text-gray-600 cursor-not-allowed opacity-40",
    badge: "bg-blue-950/80 border border-blue-700 text-blue-400",
  },
  "Second Class": {
    bg: "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/40",
    selected: "bg-emerald-500 border-2 border-emerald-300 text-white font-extrabold shadow-lg shadow-emerald-500/50 scale-110",
    booked: "bg-gray-800/60 border border-gray-700/50 text-gray-600 cursor-not-allowed opacity-40",
    badge: "bg-emerald-950/80 border border-emerald-700 text-emerald-400",
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

  /* Quick auto-select contiguous available seats */
  const autoSelectSeats = (count) => {
    if (!show) return;
    const available = show.seats.filter((s) => !s.isBooked).map((s) => s.seatNumber);
    if (available.length >= count) {
      setSelectedSeats(available.slice(0, count));
    }
  };

  const calculateTotal = () => {
    if (!show) return 0;
    return show.seats
      .filter((s) => selectedSeats.includes(s.seatNumber))
      .reduce((acc, s) => acc + s.price, 0);
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) return;
    navigate(`/addons/${showId}`, {
      state: { selectedSeats, totalPrice: calculateTotal(), show },
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
      <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Preparing 3D Theater Seating Layout...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center p-4">
        <div className="bg-red-950/60 border border-red-800 text-red-300 rounded-3xl p-8 text-center max-w-md shadow-2xl space-y-4">
          <span className="text-3xl">⚠️</span>
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
    <div className="min-h-screen bg-[#07070B] text-white pb-36 relative overflow-hidden">
      
      {/* Glow Backdrops */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 🎬 Header */}
      <div className="bg-[#0F0F17]/80 backdrop-blur-xl border-b border-gray-800/80 py-6 px-4 text-center sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              🎬 3D Interactive Screen
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">
              Select Your Preferred Seats
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              🏰 {show?.theatre} &nbsp;|&nbsp; 📅 {show?.date} &nbsp;|&nbsp; ⏰ {show?.time}
            </p>
          </div>

          {/* Quick Seat Selector Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase hidden sm:inline">Quick Select:</span>
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => autoSelectSeats(count)}
                className="bg-gray-900 hover:bg-red-950/80 border border-gray-800 hover:border-red-800 text-gray-300 hover:text-red-400 font-bold text-xs px-3 py-1.5 rounded-xl transition"
              >
                {count} {count === 1 ? "Seat" : "Seats"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🍿 3D CURVED CINEMA SCREEN DISPLAY */}
      <div className="max-w-3xl mx-auto mt-10 mb-12 px-4">
        <div className="relative">
          {/* Light Projector Cone */}
          <div className="w-full h-16 bg-gradient-to-b from-red-500/20 via-red-500/5 to-transparent rounded-t-full blur-sm" />
          
          {/* Curved Screen Bar */}
          <div className="h-4 bg-gradient-to-r from-gray-700 via-white to-gray-700 rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.4)] border border-white/20 transform -perspective-500 rotate-x-12" />
          
          <p className="text-center text-[10px] text-gray-400 font-extrabold tracking-[0.3em] uppercase mt-3">
            ✨ SCREEN THIS WAY ✨
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="max-w-3xl mx-auto px-4 mb-8 flex items-center justify-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCategoryFilter === cat
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {cat === "All" ? "All Seat Categories" : cat}
          </button>
        ))}
      </div>

      {/* 💺 SEAT LAYOUT GRID BY CATEGORY */}
      <div className="max-w-3xl mx-auto px-4 space-y-10">
        {Object.entries(grouped)
          .filter(([cat]) => activeCategoryFilter === "All" || activeCategoryFilter === cat)
          .map(([category, seats]) => {
            const style = CATEGORY_STYLES[category] || CATEGORY_STYLES["Second Class"];

            return (
              <div key={category} className="bg-[#0F0F17]/60 border border-gray-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
                
                {/* Category Header */}
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${style.badge}`}>
                      {category}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">
                      ₹{seats[0]?.price} / ticket
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-bold">
                    {seats.filter((s) => !s.isBooked).length} Available
                  </span>
                </div>

                {/* Seat Buttons Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2.5 justify-items-center">
                  {seats.map((seat) => {
                    const isSelected = selectedSeats.includes(seat.seatNumber);
                    let cls = `w-10 h-10 rounded-2xl text-xs font-extrabold flex items-center justify-center transition-all duration-200 select-none shadow-md `;

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
                        disabled={seat.isBooked}
                        className={cls}
                        title={seat.isBooked ? "Booked" : `${seat.category} - ₹${seat.price}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* 📌 LEGEND */}
      <div className="max-w-xl mx-auto px-4 mt-10 flex items-center justify-around bg-[#0F0F17]/80 border border-gray-800/80 rounded-2xl p-4 text-xs text-gray-400 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-emerald-500/30 border border-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-red-600 border border-red-400" />
          <span>Your Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-gray-800 border border-gray-700 opacity-40" />
          <span>Booked</span>
        </div>
      </div>

      {/* 💳 STICKY BOTTOM CHECKOUT DRAWER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F17]/95 border-t border-gray-800/90 p-4 md:p-5 backdrop-blur-2xl z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 font-black text-xl">
              🎟️
            </div>
            <div>
              <p className="text-xs text-gray-400">
                Selected Seats ({selectedSeats.length}):{" "}
                <span className="text-white font-bold">
                  {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}
                </span>
              </p>
              <p className="text-lg font-black text-white">
                Total: <span className="text-red-500 text-xl font-black">₹{calculateTotal()}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 disabled:opacity-40 text-white font-extrabold px-8 py-3.5 rounded-2xl transition shadow-xl shadow-red-600/30 text-sm flex items-center justify-center gap-2"
          >
            {selectedSeats.length === 0
              ? "Select Seats to Proceed"
              : `Proceed to F&B Addons (₹${calculateTotal()}) →`}
          </button>
        </div>
      </div>

    </div>
  );
}
