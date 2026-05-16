import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

// ── Category colour helpers ────────────────────────────────────────────────
const CATEGORY_STYLES = {
  Balcony: {
    bg: "bg-yellow-500",
    selected: "bg-yellow-400 ring-2 ring-yellow-300",
    booked: "bg-gray-700 cursor-not-allowed opacity-50",
    label: "text-yellow-400",
  },
  "First Class": {
    bg: "bg-blue-500",
    selected: "bg-blue-400 ring-2 ring-blue-300",
    booked: "bg-gray-700 cursor-not-allowed opacity-50",
    label: "text-blue-400",
  },
  "Second Class": {
    bg: "bg-green-500",
    selected: "bg-green-400 ring-2 ring-green-300",
    booked: "bg-gray-700 cursor-not-allowed opacity-50",
    label: "text-green-400",
  },
};

export default function Seats() {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);

  // ── Fetch show data ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchShow = async () => {
      try {
        const { data } = await API.get(`/api/shows/${showId}`);
        setShow(data);
      } catch {
        setError("Failed to load seat data. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [showId]);

  // ── Seat toggle ────────────────────────────────────────────────────────
  const toggleSeat = (seat) => {
    if (seat.isBooked) return;
    setSelectedSeats((prev) =>
      prev.includes(seat.seatNumber)
        ? prev.filter((s) => s !== seat.seatNumber)
        : [...prev, seat.seatNumber]
    );
  };

  // ── Price calculation ──────────────────────────────────────────────────
  const calculateTotal = () => {
    if (!show) return 0;
    return show.seats
      .filter((s) => selectedSeats.includes(s.seatNumber))
      .reduce((acc, s) => acc + s.price, 0);
  };

  // ── Proceed to add-ons ─────────────────────────────────────────────────
  const handleProceed = () => {
    if (selectedSeats.length === 0) return;
    // Pass selected seats via location state
    navigate(`/addons/${showId}`, {
      state: { selectedSeats, totalPrice: calculateTotal(), show },
    });
  };

  // ── Group seats by category ────────────────────────────────────────────
  const groupByCategory = () => {
    if (!show) return {};
    return show.seats.reduce((acc, seat) => {
      if (!acc[seat.category]) acc[seat.category] = [];
      acc[seat.category].push(seat);
      return acc;
    }, {});
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-red-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-gray-400">Loading seats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-xl p-8 text-center max-w-md">
          <p className="text-xl mb-4">⚠️ {error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const grouped = groupByCategory();

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-32">
      {/* ── Header ── */}
      <div className="bg-gray-900 border-b border-gray-800 py-6 px-4 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Select Your Seats
        </h1>
        <p className="text-gray-400 mt-1">
          {show?.theatre} · {show?.date} · {show?.time}
        </p>
      </div>

      {/* ── Screen indicator ── */}
      <div className="flex justify-center mt-8 mb-10 px-4">
        <div className="w-full max-w-2xl">
          <div className="h-2 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full" />
          <p className="text-center text-gray-500 text-sm mt-2 tracking-widest uppercase">
            All eyes this way please
          </p>
        </div>
      </div>

      {/* ── Seat Grid by Category ── */}
      <div className="max-w-3xl mx-auto px-4 space-y-10">
        {Object.entries(grouped).map(([category, seats]) => {
          const style = CATEGORY_STYLES[category] || CATEGORY_STYLES["Second Class"];
          return (
            <div key={category}>
              {/* Category label */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-4 h-4 rounded-sm ${style.bg}`} />
                <span className={`font-semibold ${style.label}`}>{category}</span>
                <span className="text-gray-500 text-sm">
                  — ₹{seats[0]?.price} per seat
                </span>
              </div>

              {/* Seats grid */}
              <div className="flex flex-wrap gap-2 justify-center">
                {seats.map((seat) => {
                  const isSelected = selectedSeats.includes(seat.seatNumber);
                  let cls = `w-10 h-10 rounded-md text-xs font-bold flex items-center justify-center cursor-pointer transition-all duration-150 select-none `;

                  if (seat.isBooked) {
                    cls += CATEGORY_STYLES[category].booked;
                  } else if (isSelected) {
                    cls += CATEGORY_STYLES[category].selected + " text-white scale-110";
                  } else {
                    cls += CATEGORY_STYLES[category].bg + " text-white hover:scale-105 hover:brightness-110";
                  }

                  return (
                    <button
                      key={seat.seatNumber}
                      onClick={() => toggleSeat(seat)}
                      disabled={seat.isBooked}
                      className={cls}
                      title={seat.isBooked ? "Already booked" : `₹${seat.price}`}
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

      {/* ── Legend ── */}
      <div className="max-w-3xl mx-auto px-4 mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-500" /> Available
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-400 ring-2 ring-green-300" /> Selected
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-700" /> Booked
        </div>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm">
              Selected:{" "}
              <span className="text-white font-semibold">
                {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}
              </span>
            </p>
            <p className="text-gray-400 text-sm">
              Total:{" "}
              <span className="text-red-400 font-bold text-lg">
                ₹{calculateTotal()}
              </span>
            </p>
          </div>
          <button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 w-full sm:w-auto"
          >
            {selectedSeats.length === 0 ? "Select at least 1 seat" : `Proceed → ₹${calculateTotal()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
