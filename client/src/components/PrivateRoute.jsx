import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../lib/session";

/**
 * PrivateRoute — wraps protected pages.
 * Redirects to /login if the user is not authenticated, remembering
 * where they were headed so sign-in can send them back.
 */
function PrivateRoute({ children }) {
  const location = useLocation();

  if (!getSession().isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}

export default PrivateRoute;
