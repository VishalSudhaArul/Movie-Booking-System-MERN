import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import API from "../api";
import AdminLayout from "../components/AdminLayout";
import PageHeader, { StatCard } from "../components/ui/PageHeader";
import Icon from "../components/ui/Icon";
import { ErrorState } from "../components/ui/Feedback";
import { formatPrice } from "../lib/format";

const MODULES = [
  { icon: "film", title: "Movies", desc: "Add titles, trailers, posters and details.", path: "/admin/movies" },
  { icon: "calendar", title: "Showtimes", desc: "Schedule shows, halls, dates and seat prices.", path: "/admin/shows" },
  { icon: "popcorn", title: "Snacks", desc: "Manage each theatre's food and drinks menu.", path: "/admin/snacks" },
  { icon: "car", title: "Parking", desc: "Set bike and car parking prices per theatre.", path: "/admin/parking" },
  { icon: "chart", title: "Analytics", desc: "Revenue by movie and theatre, with charts.", path: "/admin/analytics" },
  { icon: "qr", title: "Scan tickets", desc: "Verify tickets and admit guests at the door.", path: "/admin/scan" },
  { icon: "settings", title: "IoT console", desc: "Hardware simulator for gates, parking and sensors.", path: "/admin/iot" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([API.get("/api/analytics"), API.get("/api/bookings/all")])
      .then(([resAnalytics, resBookings]) => {
        setStats(resAnalytics.data?.summary || {});
        setRecentBookings(Array.isArray(resBookings.data) ? resBookings.data.slice(0, 6) : []);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSVReport = () => {
    const s = stats || {};
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Metric,Value",
        `Total Movies,${s.totalMovies || 0}`,
        `Total Shows,${s.totalShows || 0}`,
        `Total Tickets Sold,${s.totalTickets || 0}`,
        `Total Booking Value (INR),${s.totalRevenue || 0}`,
        `Report Generated,${new Date().toLocaleString()}`,
      ].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `CineBook_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Admin"
          title="Dashboard"
          subtitle="Bookings, showtimes and revenue across your theatres."
          icon="grid"
          actions={
            <button onClick={exportCSVReport} className="btn-secondary btn-sm" disabled={status !== "ready"}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
          }
        />

        {status === "error" ? (
          <ErrorState title="We couldn't load the dashboard" onRetry={load} />
        ) : (
          <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
            {status === "loading" ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[118px] rounded-card" />)
            ) : (
              <>
                <StatCard label="Movies" value={stats.totalMovies ?? 0} icon="film" />
                <StatCard label="Showtimes" value={stats.totalShows ?? 0} icon="calendar" tone="accent" />
                <StatCard label="Tickets booked" value={stats.totalTickets ?? 0} icon="ticket" tone="green" />
                <StatCard
                  label="Booking value"
                  value={formatPrice(stats.totalRevenue || 0)}
                  icon="chart"
                  tone="gold"
                  hint="Demo checkout: no money collected"
                />
              </>
            )}
          </div>
        )}

        <section aria-labelledby="modules-title" className="space-y-4">
          <h2 id="modules-title" className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Manage
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MODULES.map((m) => (
              <Link key={m.path} to={m.path} className="card card-interactive group flex items-start gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-300 shadow-inner-line">
                  <Icon name={m.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    {m.title}
                    <Icon name="arrowRight" className="h-3.5 w-3.5 text-gray-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
                  </span>
                  <span className="mt-1 block text-sm text-gray-400">{m.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden" aria-labelledby="recent-title">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id="recent-title" className="font-semibold text-white">Recent bookings</h2>
              <p className="text-xs text-gray-400">The latest tickets booked across all theatres</p>
            </div>
            <Link to="/admin/analytics" className="btn-ghost btn-sm">
              Analytics <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          </div>

          {status === "loading" ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12" />)}
            </div>
          ) : recentBookings.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Movie</th>
                    <th scope="col">Theatre</th>
                    <th scope="col">Seats</th>
                    <th scope="col">Customer</th>
                    <th scope="col" className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b._id}>
                      <td className="font-medium text-white">{b.showId?.movieId?.title || "—"}</td>
                      <td>{b.showId?.theatre || "—"}</td>
                      <td className="font-mono text-xs">{b.seats?.join(", ")}</td>
                      <td>{b.userId?.name || "—"}</td>
                      <td className="text-right font-semibold text-white">{formatPrice(b.totalPrice || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
