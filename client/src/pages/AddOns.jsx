import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function AddOns() {

  const location = useLocation();
  const navigate = useNavigate();

  const showId = location.state?.showId;
  const selectedSeats = location.state?.selectedSeats || [];

  const [snacks, setSnacks] = useState([]);
  const [parking, setParking] = useState(null);
  const [selectedSnacks, setSelectedSnacks] = useState([]);
  const [selectedParking, setSelectedParking] = useState(null);
  const [show, setShow] = useState(null);

  /* ---------- Protect Refresh ---------- */
  useEffect(() => {
    if (!showId) navigate("/");
  }, [showId, navigate]);

  /* ---------- Fetch Show + AddOns ---------- */
  useEffect(() => {

  if (!showId) return;

  axios
    .get(`http://localhost:5000/api/shows/single/${showId}`)
    .then(res => {

      setShow(res.data);

      const theatre = res.data.theatre;

      // 🔥 Load Snacks
      axios
        .get(`http://localhost:5000/api/snacks/theatre/${theatre}`)
        .then(r => setSnacks(r.data))
        .catch(() => setSnacks([]));

      // 🔥 Load Parking
      axios
        .get(`http://localhost:5000/api/parking/theatre/${theatre}`)
        .then(r => setParking(r.data))
        .catch(() => setParking(null));

    })
    .catch(err => {
      console.log("Show load error", err);
    });

}, [showId]);


  /* ---------- Snack Add ---------- */
  const addSnack = (snack) => {

    setSelectedSnacks(prev => {

      const exist = prev.find(s => s._id === snack._id);

      if (exist) {
        return prev.map(s =>
          s._id === snack._id ? { ...s, qty: s.qty + 1 } : s
        );
      }

      return [...prev, { ...snack, qty: 1 }];
    });
  };

  /* ---------- Snack Remove ---------- */
  const removeSnack = (snack) => {

    setSelectedSnacks(prev =>
      prev
        .map(s =>
          s._id === snack._id ? { ...s, qty: s.qty - 1 } : s
        )
        .filter(s => s.qty > 0)
    );
  };

  /* ---------- Calculate Total ---------- */
  const calculateTotal = () => {

    const seatTotal = selectedSeats.length * 200;

    const snackTotal = selectedSnacks.reduce(
      (acc, s) => acc + s.price * s.qty,
      0
    );

    const parkingTotal = selectedParking?.price || 0;

    return seatTotal + snackTotal + parkingTotal;
  };

  /* ---------- Confirm Booking ---------- */
  const confirmBooking = async () => {

    try {

      const userId = localStorage.getItem("userId");

      await axios.post("http://localhost:5000/api/bookings", {
        showId,
        seats: selectedSeats,
        userId,
        snacks: selectedSnacks,
        parking: selectedParking
      });

      navigate("/mybookings");

    } catch (err) {
      console.error("Booking failed", err);
      alert("Booking failed");
    }
  };

  /* ---------- Skip Booking ---------- */
  const skipBooking = async () => {

    try {

      const userId = localStorage.getItem("userId");

      await axios.post("http://localhost:5000/api/bookings", {
        showId,
        seats: selectedSeats,
        userId
      });

      navigate("/mybookings");

    } catch (err) {
      alert("Booking failed");
    }
  };

  if (!show) {
    return <p className="text-white text-center mt-10">Loading...</p>;
  }

  return (
    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl text-center mb-8">Add Extras</h1>

      {/* ---------- Snacks ---------- */}
      <h2 className="text-xl mb-4">Snacks</h2>

      {snacks.length === 0 && (
        <p className="text-gray-400">No snacks available</p>
      )}

      {snacks.map(snack => {

        const qty =
          selectedSnacks.find(s => s._id === snack._id)?.qty || 0;

        return (
          <div
            key={snack._id}
            className="flex justify-between bg-gray-900 p-4 rounded mb-3"
          >

            <span>
              {snack.name} - ₹{snack.price}
            </span>

            <div>
              <button onClick={() => removeSnack(snack)}>-</button>
              <span className="mx-2">{qty}</span>
              <button onClick={() => addSnack(snack)}>+</button>
            </div>

          </div>
        );
      })}

      {/* ---------- Parking ---------- */}
      {parking && (
        <>
          <h2 className="text-xl mt-8 mb-4">Parking</h2>

          <button
            onClick={() =>
              setSelectedParking({
                type: "Bike",
                price: parking.priceBike
              })
            }
            className={`mr-4 px-4 py-2 rounded ${
              selectedParking?.type === "Bike"
                ? "bg-green-600"
                : "bg-gray-800"
            }`}
          >
            Bike ₹{parking.priceBike}
          </button>

          <button
            onClick={() =>
              setSelectedParking({
                type: "Car",
                price: parking.priceCar
              })
            }
            className={`px-4 py-2 rounded ${
              selectedParking?.type === "Car"
                ? "bg-green-600"
                : "bg-gray-800"
            }`}
          >
            Car ₹{parking.priceCar}
          </button>
        </>
      )}

      {/* ---------- Summary ---------- */}
      <div className="text-center mt-10">

        <p className="text-lg font-bold">
          Total: ₹{calculateTotal()}
        </p>

        <button
          onClick={confirmBooking}
          className="mt-4 bg-red-600 px-6 py-3 rounded"
        >
          Confirm Booking
        </button>

        <button
          onClick={skipBooking}
          className="ml-4 mt-4 bg-gray-700 px-6 py-3 rounded"
        >
          Skip & Book
        </button>

      </div>

    </div>
  );
}

export default AddOns;
