import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMovies: 0,
    totalShows: 0,
    totalTickets: 0,
    totalRevenue: 0
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    // Fetch Stats
    axios
      .get(`${API_URL}/api/analytics`)
      .then((res) => {
        if (res.data && res.data.summary) {
          setStats(res.data.summary);
        }
      })
      .catch((err) => console.log("Dashboard stats fetch error:", err));
  }, [API_URL]);

  const logoutAdmin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="bg-[#0B0B0F] min-h-screen text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">⚙️ Admin Panel</h1>
            <p className="text-gray-400 mt-1">Real-time system overview</p>
          </div>

          <button
            onClick={logoutAdmin}
            className="bg-red-600/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-xl hover:bg-red-600 hover:text-white transition font-medium"
          >
            Logout
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <StatBox title="Movies" value={stats.totalMovies} color="text-blue-400" />
          <StatBox title="Shows" value={stats.totalShows} color="text-purple-400" />
          <StatBox title="Tickets" value={stats.totalTickets} color="text-green-400" />
          <StatBox title="Revenue" value={`₹${stats.totalRevenue?.toLocaleString()}`} color="text-red-400" />
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
    </div>
  );
}

function StatBox({ title, value, color }) {
  return (
    <div className="bg-[#111118] border border-white/5 p-6 rounded-2xl shadow-xl">
      <p className="text-gray-500 text-xs uppercase font-bold tracking-widest">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value || 0}</p>
    </div>
  );
}

function AdminCard({ title, path }) {
  return (
    <Link
      to={path}
      className="bg-gradient-to-br from-[#111118] to-[#0B0B0F] p-8 rounded-2xl border border-white/5 hover:border-red-500/50 hover:scale-[1.02] transition-all duration-300 shadow-xl text-center group"
    >
      <h2 className="text-xl font-semibold group-hover:text-red-500 transition-colors">
        {title}
      </h2>
    </Link>
  );
}

export default AdminDashboard;