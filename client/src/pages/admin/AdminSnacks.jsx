import { useEffect, useState } from "react";
import API from "../../api";

function AdminSnacks() {
  const [snacks, setSnacks] = useState([]);
  const [theatres, setTheatres] = useState([]);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [theatre, setTheatre] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);

  /* ---------- Fetch Snacks ---------- */
  const fetchSnacks = () => {
    API.get("/api/snacks/all")
      .then((res) => {
        setSnacks(res.data);
        const unique = [...new Set(res.data.map((s) => s.theatre))];
        setTheatres(unique);
      })
      .catch((err) => {
        console.log("Fetch snacks error:", err);
        setSnacks([]);
      });
  };

  useEffect(() => {
    fetchSnacks();
  }, []);

  /* ---------- Add Snack ---------- */
  const addSnack = () => {
    if (!name || !price || !theatre) return alert("Fill all fields");

    API.post("/api/snacks", {
      name,
      price,
      theatre,
    })
      .then(() => {
        setName("");
        setPrice("");
        setTheatre("");
        fetchSnacks();
      })
      .catch((err) => {
        console.log("Add snack error:", err);
        alert("Error adding snack: " + (err.response?.data?.message || err.message));
      });
  };

  /* ---------- Delete Snack ---------- */
  const deleteSnack = (id) => {
    API.delete(`/api/snacks/${id}`)
      .then(fetchSnacks)
      .catch((err) => {
        console.log("Delete snack error:", err);
        alert("Error deleting snack: " + (err.response?.data?.message || err.message));
      });
  };





  /* ---------- Group Snacks ---------- */

  const grouped = snacks.reduce((acc, snack) => {

    if (!acc[snack.theatre])
      acc[snack.theatre] = [];

    acc[snack.theatre].push(snack);

    return acc;

  }, {});

  return (
    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        🍿 Snack Management
      </h1>

      {/* ---------- Add Snack ---------- */}

      <div className="bg-[#0f172a] p-5 rounded-xl mb-8 grid md:grid-cols-4 gap-4">

        <input
          placeholder="Snack Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="adminInput"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="adminInput"
        />

        {/* ⭐ Custom Dropdown */}
        <div className="relative">

          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="adminInput cursor-pointer flex justify-between"
          >
            {theatre || "Select Theatre"}
            <span>▼</span>
          </div>

          {showDropdown && (
            <div className="dropdownMenu">

              {theatres.map(t => (
                <p
                  key={t}
                  onClick={() => {
                    setTheatre(t);
                    setShowDropdown(false);
                  }}
                  className="dropdownItem"
                >
                  {t}
                </p>
              ))}

            </div>
          )}

        </div>

        <button
          onClick={addSnack}
          className="adminBtn"
        >
          Add Snack
        </button>

      </div>

      {/* ---------- Theatre Grid ---------- */}

      <div className="grid md:grid-cols-2 gap-5">

        {Object.keys(grouped).map(theatre => (

          <div
            key={theatre}
            className="theatreCard"
          >

            <h2 className="text-lg font-semibold text-red-400 mb-3">
              🎭 {theatre}
            </h2>

            <div className="snackScroll">

              {grouped[theatre].map(snack => (

                <div
                  key={snack._id}
                  className="snackRow"
                >
                  <div>
                    <p>{snack.name}</p>
                    <p className="text-green-400 text-sm">
                      ₹{snack.price}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteSnack(snack._id)}
                    className="adminBtnDelete"
                  >
                    Delete
                  </button>

                </div>

              ))}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default AdminSnacks;
