// Single place for reading and writing the signed-in session in localStorage.

export const getSession = () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role") || "user";
  const userName = localStorage.getItem("userName") || "";
  const adminBypass = sessionStorage.getItem("admin_bypass") === "true";
  return {
    token,
    userId,
    role,
    userName,
    isLoggedIn: !!token && !!userId,
    isAdmin: role === "admin" || role === "theaterOwner" || adminBypass,
  };
};

export const saveSession = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("userId", data._id);
  localStorage.setItem("role", data.role || "user");
  localStorage.setItem("userName", data.name || "");
};

export const clearSession = () => {
  ["token", "userId", "role", "userName", "user"].forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem("admin_bypass");
};
