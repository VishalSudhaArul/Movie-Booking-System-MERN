import { useEffect,useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import RevenueCharts from "../../components/RevenueCharts";

function AdminAnalytics(){

const [data,setData] = useState({});
const [startDate,setStartDate] = useState("");
const [endDate,setEndDate] = useState("");

// useEffect(()=>{
//  fetchAnalytics();
// },[]);

// const fetchAnalytics = ()=>{
//  axios.get("http://localhost:5000/api/analytics",{
//    params:{startDate,endDate}
//  })
//  .then(res=>setData(res.data));
// };


  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = () => {
    axios.get(`${API_URL}/api/analytics`, {
      params: { startDate, endDate }
    })
    .then(res => setData(res.data))
    .catch(err => console.log("Analytics error:", err));
  };

/* ---------- EXPORT CSV ---------- */
const exportCSV = () => {

  const rows = data.movieStats.map(m => ({
    Movie: m.title,
    Tickets: m.ticketsSold,
    Revenue: m.ticketRevenue
  }));

  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map(r => Object.values(r).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "analytics.csv";
  link.click();
};

/* ---------- EXPORT PDF ---------- */
const exportPDF = () => {

  const doc = new jsPDF();

  autoTable(doc, {
    head: [["Movie", "Tickets", "Revenue"]],
    body: data.movieStats.map(m => [
      m.title,
      m.ticketsSold,
      m.ticketRevenue
    ])
  });

  doc.save("analytics.pdf");
};

return(
<div className="bg-black min-h-screen text-white p-8">

<h1 className="text-3xl font-bold mb-10">📊 Analytics Dashboard</h1>

{/* ---------- FILTER ---------- */}
<div className="mb-8 flex gap-4">

<input
type="date"
value={startDate}
onChange={e=>setStartDate(e.target.value)}
className="p-2 text-black rounded"
/>

<input
type="date"
value={endDate}
onChange={e=>setEndDate(e.target.value)}
className="p-2 text-black rounded"
/>

<button
onClick={fetchAnalytics}
className="bg-red-600 px-4 rounded"
>
Filter
</button>

<button onClick={exportCSV} className="bg-green-600 px-4 rounded">
CSV
</button>

<button onClick={exportPDF} className="bg-blue-600 px-4 rounded">
PDF
</button>

</div>

{/* ---------- MOVIE CARDS ---------- */}
<h2 className="text-xl mb-6">🎬 Movie Ticket Collection</h2>

<div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">

{data.movieStats?.map(movie=>(
<div key={movie._id}
className="bg-gradient-to-br from-[#0f172a] to-[#020617] rounded-xl p-4 shadow-lg">

<img
src={movie.poster}
alt=""
className="w-full h-60 rounded mb-3"
/>

<h3 className="text-lg font-semibold">{movie.title}</h3>

<p className="text-gray-400">
Tickets Sold: {movie.ticketsSold}
</p>

<p className="text-red-500 text-xl font-bold mt-2">
₹{movie.ticketRevenue}
</p>

</div>
))}

</div>

{/* ---------- THEATRE ---------- */}
{/* ---------- THEATRE ---------- */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

{data.theatreStats?.map(t=>(
<div
key={t._id}
className="
bg-gradient-to-br from-[#0f172a] to-[#020617]
p-5
rounded-xl
shadow-lg
hover:shadow-red-500/20
transition
flex flex-col justify-between
"
>

{/* Theatre Title */}
<h3 className="text-lg font-semibold mb-4">
🏢 {t._id}
</h3>

{/* MOVIES */}
<div className="space-y-2 text-sm text-gray-300">

{t.movies?.map((m,i)=>(
<div key={i} className="flex justify-between">
<span>🎬 {m.title}</span>
<span className="text-gray-400">₹{m.revenue}</span>
</div>
))}

</div>

<hr className="border-gray-700 my-4" />

{/* BREAKDOWN */}
<div className="space-y-2 text-sm text-gray-300">

<div className="flex justify-between">
<span>🎟 Tickets</span>
<span>₹{t.ticketRevenue}</span>
</div>

<div className="flex justify-between">
<span>🍿 Snacks</span>
<span>₹{t.snackRevenue}</span>
</div>

<div className="flex justify-between">
<span>🚗 Parking</span>
<span>₹{t.parkingRevenue}</span>
</div>

</div>

{/* TOTAL */}
<div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
<span className="text-gray-400">💰 Total</span>
<span className="text-red-500 font-bold text-lg">
₹{t.totalRevenue}
</span>
</div>

</div>
))}

</div>


{/* ---------- CHARTS ---------- */}
<RevenueCharts
 movieStats={data.movieStats}
 theatreStats={data.theatreStats}
/>

{/* ---------- SUMMARY ---------- */}
<h2 className="text-xl mt-12 mb-6">📈 Overall Summary</h2>

<div className="grid md:grid-cols-3 gap-6">

<Card title="Total Bookings" value={data.summary?.totalBookings}/>
<Card title="Total Revenue" value={data.summary?.totalRevenue}/>

</div>

</div>
);
}

function Card({title,value}){
return(
<div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-lg">
<h3 className="text-gray-400">{title}</h3>
<p className="text-3xl font-bold text-red-500 mt-2">₹{value || 0}</p>
</div>
);
}

export default AdminAnalytics;
