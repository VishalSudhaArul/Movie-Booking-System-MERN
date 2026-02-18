import { useEffect, useState } from "react";
import axios from "axios";

function AdminParking() {

  const [parkingList, setParkingList] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [revenueMap, setRevenueMap] = useState({});

  const [theatre, setTheatre] = useState("");
  const [bikePrice, setBikePrice] = useState("");
  const [carPrice, setCarPrice] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTheatre, setSearchTheatre] = useState("");

  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);


  const API_URL = process.env.REACT_APP_API_URL;



  /* FETCH DATA */

  // const fetchData = async () => {

  //   try {

  //     const parkingRes = await axios.get(
  //       "http://localhost:5000/api/parking/all"
  //     );

  //     setParkingList(parkingRes.data);

  //     const showRes = await axios.get(
  //       "http://localhost:5000/api/shows"
  //     );

  //     const unique = [
  //       ...new Set(showRes.data.map(s => s.theatre))
  //     ];

  //     setTheatres(unique);

  //     const rev = await axios.get(
  //       "http://localhost:5000/api/bookings/parking-revenue"
  //     );

  //     setRevenueMap(rev.data);

  //   } catch {
  //     setParkingList([]);
  //   }
  // };









//   const fetchData = async () => {

//   try {

//     const parkingRes = await axios.get(
//       "http://localhost:5000/api/parking/all"
//     );

//     setParkingList(parkingRes.data || []);

//   } catch (err) {
//     console.log("Parking Load Failed");
//   }

//   try {

//     const showRes = await axios.get(
//       "http://localhost:5000/api/shows"
//     );

//     const unique = [
//       ...new Set(showRes.data.map(s => s.theatre))
//     ];

//     setTheatres(unique);

//   } catch (err) {
//     console.log("Show Load Failed");
//   }

//   try {

//     const rev = await axios.get(
//       "http://localhost:5000/api/bookings/parking-revenue"
//     );

//     setRevenueMap(rev.data || {});

//   } catch (err) {
//     console.log("Revenue Load Failed");
//   }
// };



const fetchData = async () => {

  try {

    const parkingRes = await axios.get(
      `${API_URL}/api/parking/all`
    );

    setParkingList(parkingRes.data || []);

  } catch (err) {
    console.log("Parking Load Failed", err);
  }

  try {

    const showRes = await axios.get(
      `${API_URL}/api/shows`
    );

    const unique = [
      ...new Set(showRes.data.map(s => s.theatre))
    ];

    setTheatres(unique);

  } catch (err) {
    console.log("Show Load Failed", err);
  }

  try {

    const rev = await axios.get(
      `${API_URL}/api/bookings/parking-revenue`
    );

    setRevenueMap(rev.data || {});

  } catch (err) {
    console.log("Revenue Load Failed", err);
  }
};




  useEffect(() => {
    fetchData();
  }, []);

  // /* ADD / EDIT */

  // const addParking = async () => {

  //   if (!theatre || !bikePrice || !carPrice)
  //     return alert("Fill all fields");

  //   try {

  //     if (editId) {

  //       await axios.put(
  //         `http://localhost:5000/api/parking/${editId}`,
  //         {
  //           theatre,
  //           priceBike: bikePrice,
  //           priceCar: carPrice
  //         }
  //       );

  //       setEditId(null);

  //     } else {

  //       await axios.post(
  //         "http://localhost:5000/api/parking",
  //         {
  //           theatre,
  //           priceBike: bikePrice,
  //           priceCar: carPrice
  //         }
  //       );

  //     }

  //     setTheatre("");
  //     setBikePrice("");
  //     setCarPrice("");

  //     fetchData();

  //   } catch {
  //     alert("Operation Failed");
  //   }
  // };

  // /* DELETE */

  // const confirmDelete = async () => {

  //   await axios.delete(
  //     `http://localhost:5000/api/parking/${deleteId}`
  //   );

  //   setDeleteId(null);
  //   fetchData();
  // };


  /* ADD / EDIT */

const addParking = async () => {

  if (!theatre || !bikePrice || !carPrice)
    return alert("Fill all fields");

  try {

    if (editId) {

      await axios.put(
        `${API_URL}/api/parking/${editId}`,
        {
          theatre,
          priceBike: bikePrice,
          priceCar: carPrice
        }
      );

      setEditId(null);

    } else {

      await axios.post(
        `${API_URL}/api/parking`,
        {
          theatre,
          priceBike: bikePrice,
          priceCar: carPrice
        }
      );

    }

    setTheatre("");
    setBikePrice("");
    setCarPrice("");

    fetchData();

  } catch (err) {

    console.log("Parking operation failed:", err);
    alert("Operation Failed");

  }
};


/* DELETE */

const confirmDelete = async () => {

  try {

    await axios.delete(
      `${API_URL}/api/parking/${deleteId}`
    );

    setDeleteId(null);
    fetchData();

  } catch (err) {

    console.log("Delete parking failed:", err);

  }

};




  return (

    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        🚗 Parking Management
      </h1>

      {/* FORM */}

      <div className="bg-[#0f172a] p-6 rounded-xl mb-10 flex gap-4 relative">

        {/* THEATRE DROPDOWN */}

        <div className="relative w-1/3">

          <input
            value={theatre}
            placeholder="Select Theatre"
            onClick={() => setShowDropdown(!showDropdown)}
            readOnly
            className="w-full p-3 bg-[#020617] rounded cursor-pointer"
          />

          {showDropdown && (

            <div className="absolute bg-[#1e293b] w-full mt-1 rounded max-h-44 overflow-y-auto p-2 z-50">

              <input
                placeholder="Search..."
                value={searchTheatre}
                onChange={e => setSearchTheatre(e.target.value)}
                className="w-full p-2 mb-2 bg-[#020617] rounded"
              />

              {theatres
                .filter(t =>
                  t.toLowerCase().includes(
                    searchTheatre.toLowerCase()
                  )
                )
                .map(t => {

                  const exists = parkingList.some(
                    p => p.theatre === t
                  );

                  return (
                    <p
                      key={t}
                      onClick={() => {
                        if (!exists) {
                          setTheatre(t);
                          setShowDropdown(false);
                        }
                      }}
                      className={`p-2 cursor-pointer hover:bg-red-500 ${
                        exists ? "opacity-40" : ""
                      }`}
                    >
                      {t} {exists && "(Added)"}
                    </p>
                  );
                })}

            </div>
          )}

        </div>

        {/* PRICES */}

        <input
          placeholder="Bike Price"
          value={bikePrice}
          onChange={e => setBikePrice(e.target.value)}
          className="p-3 bg-[#020617] rounded w-1/4"
        />

        <input
          placeholder="Car Price"
          value={carPrice}
          onChange={e => setCarPrice(e.target.value)}
          className="p-3 bg-[#020617] rounded w-1/4"
        />

        <button
          onClick={addParking}
          className="bg-red-600 px-8 rounded"
        >
          {editId ? "Update" : "Add Parking"}
        </button>

      </div>

      {/* CARDS */}

      <div className="grid md:grid-cols-2 gap-6">

        {parkingList.map(p => (

          <div
            key={p._id}
            className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-6 rounded-xl"
          >

            <h2 className="text-xl font-semibold text-red-400">
              🎭 {p.theatre}
            </h2>

            <p className="text-green-400 mt-3">
              🏍 Bike : ₹{p.priceBike}
            </p>

            <p className="text-blue-400">
              🚗 Car : ₹{p.priceCar}
            </p>

            <p className="text-yellow-400 mt-3">
              💰 Revenue :
              ₹{revenueMap[p.theatre] || 0}
            </p>

            <div className="flex gap-3 mt-5">

              <button
                onClick={() => {
                  setEditId(p._id);
                  setTheatre(p.theatre);
                  setBikePrice(p.priceBike);
                  setCarPrice(p.priceCar);
                }}
                className="bg-yellow-400 px-4 py-2 rounded text-black"
              >
                Edit
              </button>

              <button
                onClick={() => setDeleteId(p._id)}
                className="bg-red-500 px-4 py-2 rounded"
              >
                Delete
              </button>

            </div>

          </div>

        ))}

      </div>

      {/* DELETE MODAL */}

      {deleteId && (

        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center">

          <div className="bg-[#0f172a] p-8 rounded-xl text-center">

            <h2 className="mb-5 text-xl">
              Confirm Delete Parking?
            </h2>

            <div className="flex gap-5 justify-center">

              <button
                onClick={confirmDelete}
                className="bg-red-600 px-6 py-2 rounded"
              >
                Delete
              </button>

              <button
                onClick={() => setDeleteId(null)}
                className="bg-gray-600 px-6 py-2 rounded"
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminParking;
