import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">

      <div className="flex justify-between items-center px-8 py-4 text-white">

        {/* Logo */}
        <Link to="/" className="text-red-500 font-bold text-xl">
          QuickShow
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-6 relative">

          <Link to="/" className="hover:text-red-500 transition">
            Home
          </Link>

          <Link to="/admin" className="hover:text-red-500 transition">
            Admin
          </Link>

          <Link to="/mybookings" className="hover:text-red-500 transition">
            My Bookings
          </Link>

          {/* Profile Circle */}
          <div
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center cursor-pointer font-semibold"
          >
            {user ? user.name?.charAt(0).toUpperCase() : ""}
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-14 bg-[#111118] border border-white/10 rounded-xl p-4 w-44 shadow-xl">

              {user ? (
                <>
                  <p className="mb-2 text-sm text-gray-300">
                    {user.name}
                  </p>

                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block mb-2 hover:text-red-500"
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="hover:text-red-500"
                  >
                    Register
                  </Link>
                </>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Navbar;
