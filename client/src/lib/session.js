// Single place for reading and writing the signed-in session in localStorage.
// The role stored here only decides what the UI shows; the server checks the
// real role from the database on every protected request.

// Fired on this tab whenever the session is saved, cleared or its role updated.
export const SESSION_EVENT = "cinebook:session";
const announce = () => window.dispatchEvent(new Event(SESSION_EVENT));

export const getSession = () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role") || "user";
  const userName = localStorage.getItem("userName") || "";
  return {
    token,
    userId,
    role,
    userName,
    isLoggedIn: !!token && !!userId,
    isAdmin: !!token && (role === "admin" || role === "theaterOwner"),
  };
};

export const saveSession = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("userId", data._id);
  localStorage.setItem("role", data.role || "user");
  localStorage.setItem("userName", data.name || "");
  announce();
};

export const clearSession = () => {
  ["token", "userId", "role", "userName", "user"].forEach((k) => localStorage.removeItem(k));
  // Left over from the removed admin password gate.
  sessionStorage.removeItem("admin_bypass");
  announce();
};

// Only allow redirects to paths inside this site after sign-in.
export const safeRedirectPath = (path) =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
