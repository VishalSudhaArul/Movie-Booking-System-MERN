// import { useParams, useNavigate } from "react-router-dom";
// import { useEffect, useState } from "react";
// import axios from "axios";

// function Seats() {

//   const { showId } = useParams();
//   const navigate = useNavigate();

//   const [show, setShow] = useState(null);
//   const [selectedSeats, setSelectedSeats] = useState([]);

//   useEffect(() => {

//     axios
//       .get(`http://localhost:5000/api/shows/single/${showId}`)
//       .then(res => setShow(res.data))
//       .catch(err => console.log(err));

//   }, [showId]);

//   const toggleSeat = (seat) => {
//     setSelectedSeats(prev =>
//       prev.includes(seat)
//         ? prev.filter(s => s !== seat)
//         : [...prev, seat]
//     );
//   };

//   const goToAddOns = () => {

//     navigate("/addons", {
//       state: { showId, selectedSeats }
//     });

//   };

//   if (!show) return <p className="text-white text-center mt-10">Loading seats...</p>;

//   return (
//     <div className="bg-black min-h-screen text-white p-8">

//       <h1 className="text-3xl font-bold mb-6 text-center">
//         Select Your Seats
//       </h1>

//       {/* Screen */}
//       <div className="flex justify-center mb-6">
//         <div className="w-2/3">
//           <div className="h-2 bg-gray-300 rounded-full"></div>
//           <p className="text-center text-gray-400 text-xs mt-2">
//             All eyes this way please
//           </p>
//         </div>
//       </div>

//       {/* Seats */}
//       <div className="flex justify-center">
//         <div className="grid grid-cols-10 gap-3">

//           {show.seats.map(seat => (
//             <button
//               key={seat.seatNumber}
//               disabled={seat.isBooked}
//               onClick={() => toggleSeat(seat.seatNumber)}
//               className={`w-10 h-10 rounded font-semibold
//                 ${
//                   seat.isBooked
//                     ? "bg-gray-700 cursor-not-allowed"
//                     : selectedSeats.includes(seat.seatNumber)
//                     ? "bg-green-500"
//                     : "bg-gray-300 text-black"
//                 }`}
//             >
//               {seat.seatNumber}
//             </button>
//           ))}

//         </div>
//       </div>

//       {/* Summary */}
//       <div className="mt-10 text-center">

//         <p>
//           Selected Seats:
//           <span className="text-green-400">
//             {" "}{selectedSeats.join(", ") || "None"}
//           </span>
//         </p>

//         <p className="mt-2">
//           Total Amount:
//           <span className="text-red-500 font-bold">
//             {" "}₹{selectedSeats.length * 200}
//           </span>
//         </p>

//         <button
//           onClick={goToAddOns}
//           disabled={selectedSeats.length === 0}
//           className="mt-6 bg-red-600 px-6 py-3 rounded"
//         >
//           Continue to BOOK
//         </button>

//       </div>

//     </div>
//   );
// }

// export default Seats ;


import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

function Seats() {

  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  // useEffect(() => {
  //   axios.get(`http://localhost:5000/api/shows/single/${showId}`)
  //     .then(res => setShow(res.data));
  // }, [showId]);

  useEffect(() => {

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  axios
    .get(`${API_URL}/api/shows/single/${showId}`)
    .then(res => setShow(res.data))
    .catch(err => console.log("Seat fetch error:", err));

}, [showId]);


  const toggleSeat = (seat) => {

    if (seat.isBooked) return;

    if (selectedSeats.includes(seat.seatNumber)) {
      setSelectedSeats(prev =>
        prev.filter(s => s !== seat.seatNumber)
      );
    } else {
      setSelectedSeats(prev => [...prev, seat.seatNumber]);
    }
  };

  const calculateTotal = () => {
    if (!show) return 0;

    return show.seats
      .filter(s => selectedSeats.includes(s.seatNumber))
      .reduce((acc, s) => acc + s.price, 0);
  };

  if (!show) return <p className="text-white">Loading...</p>;

  const categories = ["Balcony", "First Class", "Second Class"];

  return (
    <div className="bg-black min-h-screen text-white p-10">

      <h1 className="text-3xl text-center mb-8">
        Select Your Seats
      </h1>

      {/* Screen */}
      <div className="w-2/3 mx-auto mb-10">
        <div className="h-3 bg-gray-300 rounded-full"></div>
        <p className="text-center text-sm mt-2 text-gray-400">
          All eyes this way please
        </p>
      </div>

      {categories.map(category => {

        const seats = show.seats.filter(s => s.category === category);

        if (seats.length === 0) return null;

        const groupedRows = {};

        seats.forEach(seat => {
          const row = seat.seatNumber.charAt(0);
          if (!groupedRows[row]) groupedRows[row] = [];
          groupedRows[row].push(seat);
        });

        return (
          <div key={category} className="mb-12">

            <h2 className="text-xl mb-4 text-green-400">
              ₹{seats[0].price} {category}
            </h2>

            {Object.keys(groupedRows).map(row => (
              <div key={row} className="flex gap-3 mb-3 justify-center">

                <span className="w-6">{row}</span>

                {groupedRows[row].map(seat => {

                  const isSelected = selectedSeats.includes(seat.seatNumber);

                  return (
                    <button
                      key={seat.seatNumber}
                      onClick={() => toggleSeat(seat)}
                      className={`w-10 h-10 rounded text-sm
                        ${seat.isBooked
                          ? "bg-gray-600"
                          : isSelected
                            ? "bg-green-500"
                            : "bg-gray-300 text-black"}
                      `}
                    >
                      {seat.seatNumber.slice(1)}
                    </button>
                  );
                })}
              </div>
            ))}

          </div>
        );
      })}

      {/* Summary */}
      <div className="text-center mt-10">

        <p>
          Selected Seats:{" "}
          <span className="text-green-400">
            {selectedSeats.join(", ")}
          </span>
        </p>

        <p className="text-xl mt-2">
          Total Amount:{" "}
          <span className="text-red-500">
            ₹{calculateTotal()}
          </span>
        </p>

        <button
          onClick={() =>
            navigate("/addons", {
              state: { showId, selectedSeats }
            })
          }
          className="mt-6 bg-red-600 px-6 py-3 rounded"
        >
          Continue to BOOK
        </button>

      </div>

    </div>
  );
}

export default Seats;
