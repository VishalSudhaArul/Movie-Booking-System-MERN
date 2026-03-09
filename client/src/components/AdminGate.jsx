import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminGate() {

  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const ADMIN_PASSWORD = "123456";

  const handleAccess = () => {

    if (password === ADMIN_PASSWORD) {

      sessionStorage.setItem("admin", "true");

      navigate("/admin/dashboard");

    } else {

      alert("❌ Incorrect Admin Password");

    }

  };

  return (

    <div className="bg-black min-h-screen flex items-center justify-center text-white">

      <div className="bg-[#111827] p-8 rounded-2xl shadow-xl w-80">

        <h1 className="text-2xl font-bold text-center mb-6">
          🔐 Admin Access
        </h1>

        <input
          type="password"
          placeholder="Enter Admin Password"
          className="w-full p-3 rounded bg-black border border-gray-700 mb-4"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleAccess}
          className="bg-red-600 hover:bg-red-700 transition w-full py-2 rounded"
        >
          Enter Admin Panel
        </button>

      </div>

    </div>

  );
}

export default AdminGate;