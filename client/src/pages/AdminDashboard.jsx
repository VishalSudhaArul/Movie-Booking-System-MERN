import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function AdminDashboard() {

  const navigate = useNavigate();

  useEffect(() => {

    const isAdmin = sessionStorage.getItem("admin");

    if (!isAdmin) {
      navigate("/");
    }

  }, [navigate]);


  const logoutAdmin = () => {

    sessionStorage.removeItem("admin");

    navigate("/");

  };

  return (

    <div className="bg-black min-h-screen text-white p-10">

      <div className="flex justify-between items-center mb-10">

        <h1 className="text-3xl font-bold">
          ⚙️ Admin Panel
        </h1>

        <button
          onClick={logoutAdmin}
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>

      </div>


      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminCard title="🎬 Manage Movies" path="/admin/movies" />
        <AdminCard title="🎭 Manage Shows" path="/admin/shows" />
        <AdminCard title="🍿 Manage Snacks" path="/admin/snacks" />
        <AdminCard title="🚗 Manage Parking" path="/admin/parking" />
        <AdminCard title="📊 Analytics" path="/admin/analytics" />
        <AdminCard title="🎟 Scan Ticket" path="/admin/scan" />

      </div>

    </div>

  );
}


function AdminCard({ title, path }) {

  return (

    <Link
      to={path}
      className="
      bg-gradient-to-br from-[#0f172a] to-[#020617]
      p-8 rounded-2xl border border-gray-800
      hover:border-red-500
      hover:scale-105
      transition
      shadow-lg
      text-center"
    >

      <h2 className="text-xl font-semibold">
        {title}
      </h2>

    </Link>

  );

}

export default AdminDashboard;