import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

function RevenueCharts({ movieStats, theatreStats }) {

  /* ---------------- MOVIE CHART ---------------- */

  const movieData = {
    labels: movieStats?.map(m => m.title),
    datasets: [
      {
        label: "Ticket Revenue",
        data: movieStats?.map(m => m.ticketRevenue),
        backgroundColor: "#ef4444"   // 🔥 Bright Red
      }
    ]
  };

  /* ---------------- THEATRE CHART ---------------- */

  const theatreData = {
    labels: theatreStats?.map(t => t._id),
    datasets: [
      {
        label: "Tickets",
        data: theatreStats?.map(t => t.ticketRevenue),
        backgroundColor: "#ef4444"
      },
      {
        label: "Snacks",
        data: theatreStats?.map(t => t.snackRevenue),
        backgroundColor: "#facc15"  // Yellow
      },
      {
        label: "Parking",
        data: theatreStats?.map(t => t.parkingRevenue),
        backgroundColor: "#22c55e"  // Green
      }
    ]
  };

  /* ---------------- COMMON DARK OPTIONS ---------------- */

  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: "white"   // legend text color
        }
      }
    },

    scales: {
      x: {
        ticks: {
          color: "white"
        },
        grid: {
          color: "#374151"
        }
      },

      y: {
        ticks: {
          color: "white"
        },
        grid: {
          color: "#374151"
        }
      }
    }
  };

  return (
    <div className="space-y-12">

      <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
        <h2 className="mb-4 text-white font-semibold">
          🎬 Movie Revenue Chart
        </h2>

        <Bar data={movieData} options={chartOptions} />
      </div>

      <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
        <h2 className="mb-4 text-white font-semibold">
          🏢 Theatre Revenue Chart
        </h2>

        <Bar data={theatreData} options={chartOptions} />
      </div>

    </div>
  );
}

export default RevenueCharts;
