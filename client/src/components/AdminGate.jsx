import { Navigate } from "react-router-dom";

/**
 * AdminGate — wraps admin-only pages.
 * Redirects non-admin users to the home page.
 */
function AdminGate({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminGate;