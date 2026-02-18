// import { useEffect, useState } from "react";
// import axios from "axios";
// import QRCode from "qrcode.react";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";


// function MyBookings() {

//   // TEMP user id (replace after login)
//   const USER_ID = "PUT_ANY_EXISTING_USER_ID_HERE";

//   const [bookings, setBookings] = useState([]);

//   useEffect(() => {
//     axios.get(`http://localhost:5000/api/bookings/user/${USER_ID}`)
//       .then(res => setBookings(res.data));
//   }, []);

//   return (
//     <div className="bg-black min-h-screen text-white p-8">

//       <h1 className="text-3xl font-bold mb-8">
//         My Bookings
//       </h1>

//       {bookings.length === 0 && (
//         <p className="text-gray-400">No bookings found</p>
//       )}

//       <div className="grid grid-cols-2 gap-6">

//         {bookings.map(b => (
//           <div key={b._id} className="bg-gray-900 p-6 rounded-xl shadow-lg">

//             <h2 className="text-xl font-semibold">
//               {b.showId?.movieId?.title}
//             </h2>

//             <p className="text-gray-400">
//               🎭 {b.showId?.theatre}
//             </p>

//             <p className="text-gray-400">
//               📅 {b.showId?.date} — ⏰ {b.showId?.time}
//             </p>

//             <p className="mt-2">
//               🎟 Seats: {b.seats.join(", ")}
//             </p>

//             <p className="text-red-500 font-bold mt-2">
//               ₹ {b.totalPrice}
//             </p>

//           </div>
//         ))}

//       </div>

//     </div>
//   );
// }

// export default MyBookings;





// import { useEffect, useState } from "react";
// import axios from "axios";
// import { QRCodeCanvas } from "qrcode.react";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";

// function MyBookings() {

//   // 🔥 TEMP USER ID (Replace after login system)
//   //const USER_ID = "PUT_ANY_EXISTING_USER_ID_HERE";
//   const USER_ID = localStorage.getItem("userId");


//   const [bookings, setBookings] = useState([]);

//  useEffect(() => {

//   const userId = localStorage.getItem("userId");

//   if (!userId) return;

//   axios
//     .get(`http://localhost:5000/api/bookings/user/${userId}`)
//     .then(res => setBookings(res.data));

// }, []);


//   // 🎟 Download Ticket PDF
//   const downloadPDF = (id) => {

//     const input = document.getElementById(`ticket-${id}`);

//     html2canvas(input).then(canvas => {

//       const imgData = canvas.toDataURL("image/png");

//       const pdf = new jsPDF("p", "mm", "a4");

//       const imgWidth = 190;
//       const imgHeight = (canvas.height * imgWidth) / canvas.width;

//       pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
//       pdf.save(`QuickShow_Ticket_${id}.pdf`);

//     });
//   };

//   return (
//     <div className="bg-black min-h-screen text-white p-8">

//       <h1 className="text-3xl font-bold mb-8 text-center">
//         🎟 My Bookings
//       </h1>

//       {bookings.length === 0 && (
//         <p className="text-gray-400 text-center">
//           No bookings found
//         </p>
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

//         {bookings.map(b => (

// //           <div
// //             key={b._id}
// //             id={`ticket-${b._id}`}
// //             className="bg-gray-900 p-6 rounded-xl shadow-lg"
// //           >

// //             {/* Movie Info */}
// //             {/* <h2 className="text-xl font-semibold mb-2">
// //               🎬 {b.showId?.movieId?.title || "Movie"}
// //             </h2> */}

// //             {/* Movie Poster + Info */}
// // <div className="flex gap-4 items-center mb-4">

// //   <img
// //     src={b.showId?.movieId?.poster}
// //     alt="poster"
// //     className="w-20 h-28 rounded object-cover"
// //   />

// //   <div>
// //     <h2 className="text-xl font-semibold">
// //       {b.showId?.movieId?.title}
// //     </h2>

// //     <p className="text-gray-400 text-sm">
// //       {b.showId?.movieId?.genre}
// //     </p>
// //   </div>

// // </div>


// //             <p className="text-gray-400">
// //               🎭 Theatre: {b.showId?.theatre}
// //             </p>

// //             <p className="text-gray-400">
// //               📅 {b.showId?.date} — ⏰ {b.showId?.time}
// //             </p>

// //             {/* Seats */}
// //             <p className="mt-3">
// //               💺 Seats: {b.seats?.join(", ") || "N/A"}
// //             </p>

// //             {/* Snacks */}
// //             <p>
// // 🍿 Snacks:
// // {b.snacks?.length > 0
// //   ? b.snacks.map(s =>
// //       `${s.name} x${s.qty} (₹${s.price * s.qty})`
// //     ).join(", ")
// //   : "None"}
// // </p>

// // <p>
// // 🚗 Parking:
// // {b.parking
// //   ? `${b.parking.type} (₹${b.parking.price})`
// //   : "None"}
// // </p>


// //             {/* Total */}
// //             <p className="text-red-500 font-bold mt-3">
// //               ₹ {b.totalPrice}
// //             </p>

// //             {/* QR CODE */}
// //             <div className="mt-5 flex justify-center">
// //               <QRCodeCanvas
// //                 // value={`BookingID:${b._id}`}
// //                 // value={`http://localhost:3000/verify/${b._id}`}
// //                 //value={`http://localhost:3000/verify/${b._id}`}
// //                 //value={`http://10.131.192.148:3000/verify/${b._id}`}
// //                 //value={`http://10.131.192.148:3000/verify/${b._id}`}
// //                 value={`http://10.131.192.148:3000/verify/${b._id}`}
// //                 //value={`https://xyz.ngrok-free.dev/verify/${b._id}`}
// //                 //value={`http://10.131.192.148:3000/verify/${b._id}`}
// //                 //value={`http://10.35.128.231:3000/verify/${b._id}`}





// //                 size={120}
// //                 bgColor="#000000"
// //                 fgColor="#ffffff"
// //               />
// //             </div>

// //             {/* Download Button */}
// //             <div className="text-center mt-5">
// //               <button
// //                 onClick={() => downloadPDF(b._id)}
// //                 className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
// //               >
// //                 Download Ticket
// //               </button>
// //             </div>

// //           </div>

//  <div
//   key={b._id}
//   id={`ticket-${b._id}`}
//   className="bg-gradient-to-br from-[#0f172a] to-[#020617]
//   border border-gray-800 p-6 rounded-2xl shadow-xl"
// >

//   <div className="flex flex-col md:flex-row justify-between gap-6">

//     {/* ---------- LEFT SIDE ---------- */}
//     <div className="flex-1">

//       {/* Movie Info */}
//       <div className="flex gap-4 items-center mb-4">

//         <img
//           src={b.showId?.movieId?.poster}
//           alt="poster"
//           className="w-20 h-28 rounded-lg object-cover"
//         />

//         <div>
//           <h2 className="text-xl font-semibold">
//             {b.showId?.movieId?.title}
//           </h2>

//           <p className="text-gray-400 text-sm">
//             {b.showId?.movieId?.genre}
//           </p>
//         </div>

//       </div>

//       {/* Details */}
//       <div className="space-y-2 text-gray-300">

//         <p>🎭 Theatre: {b.showId?.theatre}</p>

//         <p>
//           📅 {b.showId?.date} — ⏰ {b.showId?.time}
//         </p>

//         <p>
//           💺 Seats:
//           <span className="text-green-400 ml-1">
//             {b.seats?.join(", ")}
//           </span>
//         </p>

//         <p>
//           🍿 Snacks:
//           {b.snacks?.length > 0
//             ? b.snacks.map(s =>
//                 `${s.name} x${s.qty} (₹${s.price * s.qty})`
//               ).join(", ")
//             : " None"}
//         </p>

//         <p>
//           🚗 Parking:
//           {b.parking
//             ? `${b.parking.type} (₹${b.parking.price})`
//             : " None"}
//         </p>

//       </div>

//       {/* Divider */}
//       <div className="border-t border-gray-700 my-4"></div>

//       {/* Price */}
//       <p className="text-red-500 font-bold text-lg">
//         ₹ {b.totalPrice}
//       </p>

//     </div>

//     {/* ---------- RIGHT SIDE ---------- */}
//     <div className="flex flex-col items-center justify-start">

//       <div className="bg-white p-3 rounded-lg shadow-md">
//         <QRCodeCanvas
//           value={`http://10.131.192.148:3000/verify/${b._id}`}
//           size={120}
//           bgColor="#ffffff"
//           fgColor="#000000"
//         />
//       </div>

//       <button
//         onClick={() => downloadPDF(b._id)}
//         className="mt-4 bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
//       >
//         Download Ticket
//       </button>

//     </div>

//   </div>

// </div>


//         ))}

//       </div>

//     </div>
//   );
// }

// export default MyBookings;








import { useEffect, useState } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API_URL = process.env.REACT_APP_API_URL;



function MyBookings() {

  const [bookings, setBookings] = useState([]);

  /* ---------- Fetch Bookings ---------- */
  // useEffect(() => {

  //   const userId = localStorage.getItem("userId");
  //   if (!userId) return;

  //   axios
  //     .get(`http://localhost:5000/api/bookings/user/${userId}`)
  //     .then(res => setBookings(res.data));

  // }, []);

useEffect(() => {

  const userId = localStorage.getItem("userId");
  if (!userId) return;

  axios
    .get(`${API_URL}/api/bookings/user/${userId}`)
    .then(res => setBookings(res.data))
    .catch(err => console.log("Bookings load error:", err));

}, []);

  

  /* ---------- Download Ticket PDF ---------- */
  const downloadPDF = (id) => {

    const input = document.getElementById(`ticket-${id}`);

    html2canvas(input).then(canvas => {

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`QuickShow_Ticket_${id}.pdf`);

    });

  };


const getShowStatus = (booking) => {

  if (!booking.showId?.date || !booking.showId?.time)
    return "VALID";

  try {

    // Split time
    let [time, modifier] = booking.showId.time.split(" ");

    let [hours, minutes] = time.split(":");

    hours = parseInt(hours);

    if (modifier === "PM" && hours !== 12)
      hours += 12;

    if (modifier === "AM" && hours === 12)
      hours = 0;

    const showDateTime = new Date(booking.showId.date);

    showDateTime.setHours(hours);
    showDateTime.setMinutes(minutes || 0);
    showDateTime.setSeconds(0);

    const now = new Date();

    if (now > showDateTime)
      return "COMPLETED";

    if (booking.used)
      return "USED";

    return "VALID";

  } catch {
    return "VALID";
  }
};

const FRONTEND_URL =
  process.env.REACT_APP_FRONTEND_URL ||
  window.location.origin;



  return (
    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl font-bold mb-10 text-center">
        🎟 My Bookings
      </h1>

      {bookings.length === 0 && (
        <p className="text-gray-400 text-center">
          No bookings found
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {bookings.map(b => (

          <div
            key={b._id}
            id={`ticket-${b._id}`}
            className="
              relative
              bg-gradient-to-br from-[#0f172a] to-[#020617]
              border border-gray-800
              p-6
              rounded-2xl
              shadow-2xl
              overflow-hidden
            "
          >

            {/* Ticket Fold Effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between gap-6">

              {/* ================= LEFT SIDE ================= */}
              <div className="flex-1">

                {/* Movie Info */}
                <div className="flex gap-4 items-center mb-4">

                  <img
                    src={b.showId?.movieId?.poster}
                    alt="poster"
                    className="w-20 h-28 rounded-lg object-cover"
                  />

                  <div>
                    <h2 className="text-xl font-semibold">
                      {b.showId?.movieId?.title}
                    </h2>

                    <p className="text-gray-400 text-sm">
                      {b.showId?.movieId?.genre}
                    </p>
                  </div>

                </div>

                {/* Details */}
                <p className="text-xs text-gray-500">
  Booked By: {b.userId?.name}
</p>


                <div className="space-y-2 text-gray-300">
                  <p className="text-xs text-gray-500">
  Booking ID: {b._id}
</p>


                  <p>🎭 Theatre: {b.showId?.theatre}</p>

                  <p>
                    📅 {b.showId?.date} — ⏰ {b.showId?.time}
                  </p>

                  <p>
                    💺 Seats:
                    <span className="text-green-400 ml-1">
                      {b.seats?.join(", ")}
                    </span>
                  </p>

                  <p>
                    🍿 Snacks:
                    {b.snacks?.length > 0
                      ? b.snacks.map(s =>
                          `${s.name} x${s.qty} (₹${s.price * s.qty})`
                        ).join(", ")
                      : " None"}
                  </p>

                  <p>
                    🚗 Parking:
                    {b.parking
                      ? `${b.parking.type} (₹${b.parking.price})`
                      : " None"}
                  </p>

                </div>

                {/* -------- Perforated Divider -------- */}
                <div className="relative my-6">

                  <div className="border-t border-dashed border-gray-600"></div>

                  <div className="absolute -left-7 top-[-8px] w-4 h-4 bg-black rounded-full"></div>
                  <div className="absolute -right-7 top-[-8px] w-4 h-4 bg-black rounded-full"></div>

                </div>

                {/* Price + Status */}
                <div className="flex justify-between items-center">

                  <p className="text-red-500 font-bold text-lg">
                    ₹ {b.totalPrice}
                  </p>

                  {/* <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${b.used
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"}
                    `}
                  >
                    {b.used ? "USED" : "VALID"}
                  </span> */}


                  <span
  className={`px-3 py-1 rounded-full text-xs font-semibold
    ${
      getShowStatus(b) === "COMPLETED"
        ? "bg-gray-500/20 text-gray-400"
        : getShowStatus(b) === "USED"
        ? "bg-red-500/20 text-red-400"
        : "bg-green-500/20 text-green-400"
    }
  `}
>
  {getShowStatus(b)}
</span>


                </div>

              </div>

              {/* ================= RIGHT SIDE ================= */}
              <div className="flex flex-col items-center justify-center">

                {/* QR with Scan Animation */}
                <div className="relative bg-white p-3 rounded-lg shadow-md overflow-hidden">
{/* 
                  <QRCodeCanvas
                    value={`http://10.131.192.148:3000/verify/${b._id}`}
                    size={120}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  /> */}


                  {/* const FRONTEND_URL =
  process.env.REACT_APP_FRONTEND_URL ||
  window.location.origin; */}

<QRCodeCanvas
  value={`${FRONTEND_URL}/verify/${b._id}`}
  size={120}
  bgColor="#ffffff"
  fgColor="#000000"
/>


                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="scan-line"></div>
                  </div>

                </div>

                <button
                  onClick={() => downloadPDF(b._id)}
                  className="mt-4 bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  Download Ticket
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default MyBookings;
