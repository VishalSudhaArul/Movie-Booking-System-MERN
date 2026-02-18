import { useState } from "react";
import axios from "axios";

function AdminScan() {

  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState(null);
  const [message, setMessage] = useState("");

  // const verifyTicket = () => {

  //   axios
  //     .get(`http://localhost:5000/api/bookings/verify/${bookingId}`)
  //     .then(res => {
  //       setBooking(res.data);
  //       setMessage("");
  //     })
  //     .catch(() => setMessage("Invalid Ticket"));
  // };

  // const markUsed = () => {

  //   axios
  //     .put(`http://localhost:5000/api/bookings/use/${bookingId}`)
  //     .then(res => setMessage(res.data.message));
  // };


   const verifyTicket = () => {

    axios
      .get(`http://localhost:5000/api/bookings/verify/${bookingId}`)
      .then(res => {
        setBooking(res.data);
        setMessage("");
      })
      .catch(() => setMessage("Invalid Ticket"));
  };

  const markUsed = () => {

    axios
      .put(`http://localhost:5000/api/bookings/use/${bookingId}`)
      .then(res => setMessage(res.data.message));
  };



  return (
    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl text-center mb-6">
        🎟 Ticket Scanner
      </h1>

      <div className="flex justify-center gap-3">

        <input
          value={bookingId}
          onChange={e => setBookingId(e.target.value)}
          placeholder="Paste Booking ID"
          className="p-2 rounded text-black"
        />

        <button
          onClick={verifyTicket}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Verify
        </button>

      </div>

      {booking && (
        <div className="mt-6 text-center">

          <h2>{booking.showId?.movieId?.title}</h2>
          <p>Seats: {booking.seats.join(", ")}</p>

          <button
            onClick={markUsed}
            className="mt-4 bg-green-600 px-4 py-2 rounded"
          >
            Mark as Used
          </button>

        </div>
      )}

      {message && (
        <p className="text-center mt-4 text-yellow-400">
          {message}
        </p>
      )}

    </div>
  );
}

export default AdminScan;
