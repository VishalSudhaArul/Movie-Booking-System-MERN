import { useCallback, useEffect, useState } from "react";
import API from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import RevenueCharts from "../../components/RevenueCharts";
import AdminLayout from "../../components/AdminLayout";
import PageHeader, { StatCard } from "../../components/ui/PageHeader";
import Icon from "../../components/ui/Icon";
import Poster from "../../components/Poster";
import { EmptyState, ErrorState } from "../../components/ui/Feedback";
import { formatPrice } from "../../lib/format";

const PERIODS = ["All", "Today", "Week", "Month"];
const isoDay = (d) => d.toISOString().split("T")[0];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState("All");

  const fetchAnalytics = useCallback((start = "", end = "") => {
    setStatus("loading");
    const params = start && end ? { startDate: start, endDate: `${end}T23:59:59` } : {};
    API.get("/api/analytics", { params })
      .then((res) => {
        setData(res.data || {});
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const choosePeriod = (p) => {
    setPeriod(p);
    if (p === "All") {
      setStartDate("");
      setEndDate("");
      fetchAnalytics();
      return;
    }
    const today = new Date();
    const start = new Date(today);
    if (p === "Week") start.setDate(start.getDate() - 7);
    if (p === "Month") start.setDate(start.getDate() - 30);
    setStartDate(isoDay(start));
    setEndDate(isoDay(today));
    fetchAnalytics(isoDay(start), isoDay(today));
  };

  const applyRange = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setPeriod("Custom");
    fetchAnalytics(startDate, endDate);
  };

  const movieStats = [...(data?.movieStats || [])].sort((a, b) => b.ticketRevenue - a.ticketRevenue);
  const theatreStats = data?.theatreStats || [];
  const summary = data?.summary || {};
  const ticketTotal = movieStats.reduce((n, m) => n + (m.ticketRevenue || 0), 0);

  const exportCSV = () => {
    if (!movieStats.length) return;
    const csv = [
      "Movie,Tickets,Ticket value (INR)",
      ...movieStats.map((m) => `"${String(m.title).replace(/"/g, '""')}",${m.ticketsSold},${m.ticketRevenue}`),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `CineBook_Analytics_${Date.now()}.csv`;
    link.click();
  };

  const exportPDF = () => {
    if (!movieStats.length) return;
    const doc = new jsPDF();
    doc.text("CineBook analytics (demo checkout: values are not collected payments)", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Movie", "Tickets", "Ticket value (INR)"]],
      body: movieStats.map((m) => [m.title, m.ticketsSold, `Rs. ${m.ticketRevenue}`]),
    });
    doc.save(`CineBook_Analytics_${Date.now()}.pdf`);
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          eyebrow="Admin"
          title="Analytics"
          subtitle="Booking value by movie and theatre. Checkout is a demo, so these are booked values, not collected payments."
          icon="chart"
          actions={
            <>
              <button onClick={exportCSV} className="btn-secondary btn-sm" disabled={!movieStats.length}>
                <Icon name="download" className="h-4 w-4" /> CSV
              </button>
              <button onClick={exportPDF} className="btn-secondary btn-sm" disabled={!movieStats.length}>
                <Icon name="download" className="h-4 w-4" /> PDF
              </button>
            </>
          }
        />

        {/* Filters: one row above everything they affect */}
        <div className="card flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1" role="group" aria-label="Time period">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => choosePeriod(p)} aria-pressed={period === p} className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold transition ${period === p ? "bg-brand-gradient text-white" : "text-gray-400 hover:text-white"}`}>
                {p === "All" ? "All time" : p === "Week" ? "Last 7 days" : p === "Month" ? "Last 30 days" : p}
              </button>
            ))}
          </div>
          <form onSubmit={applyRange} className="flex flex-wrap items-center gap-2">
            <label htmlFor="a-start" className="sr-only">From</label>
            <input id="a-start" type="date" className="input w-auto py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-xs text-gray-500">to</span>
            <label htmlFor="a-end" className="sr-only">To</label>
            <input id="a-end" type="date" className="input w-auto py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button type="submit" className="btn-secondary btn-sm" disabled={!startDate || !endDate}>Apply</button>
          </form>
        </div>

        {status === "error" ? (
          <ErrorState title="We couldn't load analytics" onRetry={() => fetchAnalytics(startDate, endDate)} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
              {status === "loading" ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[104px] rounded-2xl" />)
              ) : (
                <>
                  <StatCard label="Movies" value={summary.totalMovies ?? 0} icon="film" />
                  <StatCard label="Showtimes" value={summary.totalShows ?? 0} icon="calendar" tone="accent" />
                  <StatCard label="Tickets" value={summary.totalTickets ?? 0} icon="ticket" tone="green" />
                  <StatCard label="Booking value" value={formatPrice(summary.totalRevenue || 0)} icon="chart" tone="gold" />
                </>
              )}
            </div>

            {status === "ready" && movieStats.length === 0 ? (
              <EmptyState icon="chart" title="No bookings in this period" message="Try a longer time range." />
            ) : (
              status === "ready" && (
                <>
                  <section className="card overflow-hidden" aria-labelledby="by-movie">
                    <h2 id="by-movie" className="border-b border-white/[0.07] px-5 py-4 font-semibold text-white">By movie</h2>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th scope="col">Movie</th>
                            <th scope="col" className="text-right">Tickets</th>
                            <th scope="col" className="text-right">Ticket value</th>
                            <th scope="col" className="w-1/4">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movieStats.map((m, i) => {
                            const share = ticketTotal ? Math.round((m.ticketRevenue / ticketTotal) * 100) : 0;
                            return (
                              <tr key={m._id}>
                                <td>
                                  <span className="flex items-center gap-3">
                                    <Poster src={m.poster} alt="" className="h-10 w-7 shrink-0 rounded" />
                                    <span className="font-medium text-white">{m.title}</span>
                                    {i === 0 && <span className="badge-accent">Top</span>}
                                  </span>
                                </td>
                                <td className="text-right">{m.ticketsSold}</td>
                                <td className="text-right font-semibold text-white">{formatPrice(m.ticketRevenue)}</td>
                                <td>
                                  <span className="flex items-center gap-2">
                                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                      <span className="block h-full rounded-full bg-[#3987e5]" style={{ width: `${share}%` }} />
                                    </span>
                                    <span className="w-9 text-right text-xs text-gray-400">{share}%</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section aria-labelledby="by-theatre" className="space-y-4">
                    <h2 id="by-theatre" className="font-semibold text-white">By theatre</h2>
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {theatreStats.map((t) => (
                        <li key={t._id} className="card p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-white">{t._id}</h3>
                            <span className="font-display text-lg font-bold text-white">{formatPrice(t.totalRevenue)}</span>
                          </div>
                          <dl className="mt-4 space-y-2 text-sm">
                            {[
                              ["Tickets", t.ticketRevenue, "#3987e5"],
                              ["Snacks", t.snackRevenue, "#d95926"],
                              ["Parking", t.parkingRevenue, "#199e70"],
                            ].map(([label, value, color]) => (
                              <div key={label} className="flex items-center justify-between">
                                <dt className="flex items-center gap-2 text-gray-400">
                                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
                                  {label}
                                </dt>
                                <dd className="font-medium text-gray-200">{formatPrice(value)}</dd>
                              </div>
                            ))}
                          </dl>
                          {t.movies?.length > 0 && (
                            <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs text-gray-500">
                              {t.movies.map((m) => m.title).join(" · ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <RevenueCharts movieStats={movieStats} theatreStats={theatreStats} />
                </>
              )
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
