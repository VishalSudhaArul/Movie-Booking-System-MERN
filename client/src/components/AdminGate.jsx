import React, { useState } from "react";
import { Navigate } from "react-router-dom";

/**
 * AdminGate — wraps admin-only pages.
 * Asks for a password '123456' if the user isn't a logged-in admin.
 */
function AdminGate({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  
  // Use session storage to remember if they entered the bypass password
  const [passBypass, setPassBypass] = useState(sessionStorage.getItem("admin_bypass") === "true");
  const [inputPass, setInputPass] = useState("");
  const [error, setError] = useState("");

  const handleVerify = (e) => {
    e.preventDefault();
    if (inputPass === "123456") {
      sessionStorage.setItem("admin_bypass", "true");
      setPassBypass(true);
    } else {
      setError("Incorrect Admin Password");
    }
  };

  // If they are a logged-in admin, let them through
  if (token && (role === "admin" || role === "theaterOwner")) {
    return children;
  }

  // If they already entered the secret password this session, let them through
  if (passBypass) {
    return children;
  }

  // Otherwise, show the password prompt
  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6">
      <div className="bg-[#111118] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
        <p className="text-gray-400 mb-6 text-sm">Please enter the authorized password to proceed</p>
        
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="password"
            placeholder="Enter Password"
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
            className="w-full bg-gray-950 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs text-left px-1">{error}</p>}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-600/30"
          >
            Unlock Panel
          </button>
        </form>
        
        <button 
          onClick={() => window.location.href = "/"}
          className="mt-6 text-gray-500 hover:text-white text-xs transition"
        >
          Return to Site
        </button>
      </div>
    </div>
  );
}

export default AdminGate;