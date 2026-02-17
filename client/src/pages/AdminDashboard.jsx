import { Link } from "react-router-dom";

function AdminDashboard() {
  return (
    <div className="bg-black min-h-screen text-white p-8">

      <h1 className="text-3xl font-bold mb-8 text-center">
        ⚙️ Admin Panel
      </h1>

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
      className="bg-gradient-to-br from-[#0f172a] to-[#020617]
      p-6 rounded-xl border border-gray-800 hover:border-red-500
      transition shadow-lg text-center"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
    </Link>
  );
}

export default AdminDashboard;
