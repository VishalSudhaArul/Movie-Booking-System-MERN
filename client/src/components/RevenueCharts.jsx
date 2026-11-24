import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatPrice } from "../lib/format";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Categorical series colours validated for colour-blind separation on the dark
// card surface (#0D1324): blue, orange, aqua, in this fixed order.
const SERIES = { tickets: "#3987e5", snacks: "#d95926", parking: "#199e70" };
const TEXT = "#c3c8d6";
const MUTED = "#8a93a8";
const GRID = "rgba(255,255,255,0.06)";

const bar = (color) => ({
  backgroundColor: color,
  hoverBackgroundColor: color,
  borderRadius: { topLeft: 4, topRight: 4 },
  borderSkipped: "bottom",
  maxBarThickness: 36,
});

const baseOptions = (showLegend) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: {
      display: showLegend,
      position: "top",
      align: "start",
      labels: { color: TEXT, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, padding: 16 },
    },
    tooltip: {
      backgroundColor: "#121A30",
      borderColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      titleColor: "#fff",
      bodyColor: TEXT,
      padding: 10,
      callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatPrice(ctx.parsed.y)}` },
    },
  },
  scales: {
    x: { ticks: { color: MUTED }, grid: { display: false }, border: { color: GRID } },
    y: {
      beginAtZero: true,
      ticks: { color: MUTED, callback: (v) => formatPrice(v) },
      grid: { color: GRID },
      border: { display: false },
    },
  },
});

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      <div className="mt-4 h-72">{children}</div>
    </section>
  );
}

function RevenueCharts({ movieStats = [], theatreStats = [] }) {
  if (!movieStats.length && !theatreStats.length) return null;

  const movieData = {
    labels: movieStats.map((m) => m.title),
    datasets: [{ label: "Ticket value", data: movieStats.map((m) => m.ticketRevenue), ...bar(SERIES.tickets) }],
  };

  const theatreData = {
    labels: theatreStats.map((t) => t._id),
    datasets: [
      { label: "Tickets", data: theatreStats.map((t) => t.ticketRevenue), ...bar(SERIES.tickets) },
      { label: "Snacks", data: theatreStats.map((t) => t.snackRevenue), ...bar(SERIES.snacks) },
      { label: "Parking", data: theatreStats.map((t) => t.parkingRevenue), ...bar(SERIES.parking) },
    ],
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Ticket value by movie" subtitle="Seat prices of booked tickets">
        <Bar data={movieData} options={baseOptions(false)} aria-label="Bar chart of ticket value by movie. The same figures are in the table above." role="img" />
      </ChartCard>
      <ChartCard title="Value by theatre" subtitle="Tickets, snacks and parking">
        <Bar data={theatreData} options={baseOptions(true)} aria-label="Grouped bar chart of ticket, snack and parking value by theatre. The same figures are in the theatre cards above." role="img" />
      </ChartCard>
    </div>
  );
}

export default RevenueCharts;
