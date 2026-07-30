import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import API from "../api";
import axios from "axios";

function AddOns() {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedSeats = location.state?.selectedSeats || [];
  const initialShow = location.state?.show;

  const [snacks, setSnacks] = useState([]);
  const [parking, setParking] = useState(null);
  const [selectedSnacks, setSelectedSnacks] = useState([]);
  const [selectedParking, setSelectedParking] = useState(null);
  const [show, setShow] = useState(initialShow || null);

  // Promo code state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMsg, setCouponMsg] = useState({ text: "", type: "" });
  const [activeCoupons, setActiveCoupons] = useState([]);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const userId = user?._id || user?.id || localStorage.getItem("userId");
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  /* ---------- Protect Refresh ---------- */
  useEffect(() => {
    if (!showId || selectedSeats.length === 0) {
      navigate("/");
    }
  }, [showId, selectedSeats, navigate]);

  /* ---------- Fetch Show + AddOns + Coupons ---------- */
  useEffect(() => {
    if (!showId) return;

    const loadData = async () => {
      try {
        let currentShow = show;
        if (!currentShow) {
          const res = await API.get(`/api/shows/single/${showId}`);
          currentShow = res.data;
          setShow(currentShow);
        }

        const theatre = currentShow.theatre;

        // Fetch Snacks
        API.get(`/api/snacks/theatre/${theatre}`)
          .then((r) => setSnacks(r.data))
          .catch(() => setSnacks([]));

        // Fetch Parking
        API.get(`/api/parking/theatre/${theatre}`)
          .then((r) => setParking(r.data))
          .catch(() => setParking(null));

        // Fetch available coupons
        axios
          .get(`${API_URL}/api/coupons/active`)
          .then((r) => setActiveCoupons(r.data))
          .catch(() => {});
      } catch (err) {
        console.error("Data load error", err);
      }
    };

    loadData();
  }, [showId]);

  /* ---------- Snack Add & Remove ---------- */
  const addSnack = (snack) => {
    setSelectedSnacks((prev) => {
      const exist = prev.find((s) => s._id === snack._id);
      if (exist) {
        return prev.map((s) =>
          s._id === snack._id ? { ...s, qty: s.qty + 1 } : s
        );
      }
      return [...prev, { ...snack, qty: 1 }];
    });
  };

  const removeSnack = (snack) => {
    setSelectedSnacks((prev) =>
      prev
        .map((s) => (s._id === snack._id ? { ...s, qty: s.qty - 1 } : s))
        .filter((s) => s.qty > 0)
    );
  };

  const calculateSubtotal = () => {
    if (!show) return 0;
    const seatTotal = show.seats
      .filter((s) => selectedSeats.includes(s.seatNumber))
      .reduce((acc, s) => acc + s.price, 0);

    const snackTotal = selectedSnacks.reduce(
      (acc, s) => acc + s.price * s.qty,
      0
    );

    const parkingTotal = selectedParking?.price || 0;
    return seatTotal + snackTotal + parkingTotal;
  };

  const subtotal = calculateSubtotal();
  const finalTotal = Math.max(0, subtotal - discountAmount);

  /* ---------- Apply Coupon ---------- */
  const handleApplyCoupon = async (codeToApply) => {
    const code = codeToApply || couponCode;
    if (!code.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/api/coupons/validate`, {
        code,
        totalAmount: subtotal,
      });

      if (res.data.success) {
        setAppliedCoupon(res.data.code);
        setDiscountAmount(res.data.discountAmount);
        setCouponMsg({ text: res.data.message, type: "success" });
      }
    } catch (err) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponMsg({
        text: err.response?.data?.message || "Invalid coupon code",
        type: "error",
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponMsg({ text: "Coupon removed", type: "info" });
    setTimeout(() => setCouponMsg({ text: "", type: "" }), 2000);
  };

  /* ---------- Confirm Booking ---------- */
  const confirmBooking = async () => {
    try {
      await API.post(`/api/bookings`, {
        showId,
        seats: selectedSeats,
        userId,
        snacks: selectedSnacks,
        parking: selectedParking,
        totalPrice: finalTotal,
      });
      navigate("/mybookings");
    } catch (err) {
      console.error("Booking failed", err);
      alert("Booking failed");
    }
  };

  const skipBooking = async () => {
    try {
      await API.post(`/api/bookings`, {
        showId,
        seats: selectedSeats,
        userId,
        totalPrice: finalTotal,
      });
      navigate("/mybookings");
    } catch (err) {
      console.error("Booking failed", err);
      alert("Booking failed");
    }
  };

  if (!show) {
    return <p className="text-white text-center mt-10">Loading...</p>;
  }

  return (
    <div className="bg-black min-h-screen text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-gray-900/70 border border-gray-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-8">
        
        <div className="border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-extrabold text-white text-center tracking-wide">
            Add Extras & Checkout Summary
          </h1>
          <p className="text-center text-sm text-gray-400 mt-1">
            Theater: <span className="text-red-400 font-semibold">{show.theatre}</span> | Seats: <span className="text-white font-semibold">{selectedSeats.join(", ")}</span>
          </p>
        </div>

        {/* ---------- Snacks ---------- */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
            🍿 Refreshments & Snacks
          </h2>

          {snacks.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No snacks available for this theater.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snacks.map((snack) => {
                const qty = selectedSnacks.find((s) => s._id === snack._id)?.qty || 0;
                return (
                  <div
                    key={snack._id}
                    className="flex justify-between items-center bg-gray-950 p-4 rounded-2xl border border-gray-800"
                  >
                    <div>
                      <span className="font-semibold text-white block">{snack.name}</span>
                      <span className="text-xs text-red-400 font-bold">₹{snack.price}</span>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-xl">
                      <button
                        onClick={() => removeSnack(snack)}
                        className="text-gray-400 hover:text-white font-bold text-lg"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-white min-w-[1.25rem] text-center">{qty}</span>
                      <button
                        onClick={() => addSnack(snack)}
                        className="text-red-500 hover:text-red-400 font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Parking ---------- */}
        {parking && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              🚗 Vehicle Parking
            </h2>

            <div className="flex gap-4">
              <button
                onClick={() =>
                  setSelectedParking(
                    selectedParking?.type === "Bike"
                      ? null
                      : { type: "Bike", price: parking.priceBike }
                  )
                }
                className={`flex-1 p-4 rounded-2xl border transition text-center font-semibold text-sm ${
                  selectedParking?.type === "Bike"
                    ? "bg-red-950/80 border-red-500 text-red-400 shadow-lg shadow-red-900/20"
                    : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                }`}
              >
                🏍 Bike Parking (₹{parking.priceBike})
              </button>

              <button
                onClick={() =>
                  setSelectedParking(
                    selectedParking?.type === "Car"
                      ? null
                      : { type: "Car", price: parking.priceCar }
                  )
                }
                className={`flex-1 p-4 rounded-2xl border transition text-center font-semibold text-sm ${
                  selectedParking?.type === "Car"
                    ? "bg-red-950/80 border-red-500 text-red-400 shadow-lg shadow-red-900/20"
                    : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                }`}
              >
                🚗 Car Parking (₹{parking.priceCar})
              </button>
            </div>
          </div>
        )}

        {/* ---------- Promo Code / Discount Section ---------- */}
        <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🏷️ Promo Code / Discount Coupon
          </h2>

          <div className="flex gap-3">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code (e.g. CINE50)"
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition"
              disabled={!!appliedCoupon}
            />
            {appliedCoupon ? (
              <button
                onClick={handleRemoveCoupon}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={() => handleApplyCoupon()}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-md"
              >
                Apply Code
              </button>
            )}
          </div>

          {couponMsg.text && (
            <p
              className={`text-xs font-semibold ${
                couponMsg.type === "success"
                  ? "text-green-400"
                  : couponMsg.type === "error"
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              {couponMsg.text}
            </p>
          )}

          {/* Quick available codes */}
          {activeCoupons.length > 0 && !appliedCoupon && (
            <div className="pt-2">
              <p className="text-xs text-gray-400 mb-2">Available Coupons:</p>
              <div className="flex flex-wrap gap-2">
                {activeCoupons.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCouponCode(c.code);
                      handleApplyCoupon(c.code);
                    }}
                    className="text-xs bg-red-950/60 border border-red-800/80 text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-900/60 transition"
                  >
                    🏷️ <span className="font-bold">{c.code}</span> ({c.description})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Summary & Total ---------- */}
        <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 space-y-3">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal:</span>
            <span className="font-semibold text-white">₹{subtotal}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-400 font-semibold">
              <span>Discount ({appliedCoupon}):</span>
              <span>- ₹{discountAmount}</span>
            </div>
          )}

          <div className="flex justify-between text-xl font-extrabold text-white border-t border-gray-800 pt-3">
            <span>Total Payable:</span>
            <span className="text-red-500">₹{finalTotal}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={confirmBooking}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition text-center shadow-lg shadow-red-600/30"
          >
            Confirm & Proceed
          </button>
          <button
            onClick={skipBooking}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3.5 px-6 rounded-2xl transition text-center"
          >
            Skip Extras & Proceed
          </button>
        </div>

      </div>
    </div>
  );
}

export default AddOns;