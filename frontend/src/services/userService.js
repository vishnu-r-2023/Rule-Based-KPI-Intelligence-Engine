import { USER_ROLES } from "../config/navigation";

const USER_STORAGE_KEY = "enterprise-dashboard-user";

const DEFAULT_USER = Object.freeze({
  id: "usr-001",
  name: "Vishnu R",
  email: "vishnu.r2023csbs@sece.ac.in",
  role: USER_ROLES.ADMIN,
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCdRGOcYbQAgdQSztklApJCbUn80iyLIoDi4zu8CQvUQLtjPtGVu4ct4RGJhue4Xci7Xk0MlL_dx1I4l7krfvTmlyKiMw-o_cbOdBF1O3I_XaA5CxP6BfQyVW1s-UVN2AVlYctm9HqJxkOUfZmTsliNU0XRatPY-nCTJlZlQtl4lVfd6bRnlcv9BqY9RoknKiiWaWqj40-o9pODdpn15aCwFNDZ6RZvjwkDmjrZQWZukw6-5TwBqUerN_r9SXH-SpN18NFQPHL3048",
});

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin" || role === "system admin") return USER_ROLES.ADMIN;
  if (role === "manager" || role === "senior analyst" || role === "cfo office") {
    return USER_ROLES.MANAGER;
  }
  if (role === "employee") return USER_ROLES.EMPLOYEE;
  return USER_ROLES.EMPLOYEE;
};

const normalizeName = (value) => {
  const name = String(value || "").trim();
  if (!name) return DEFAULT_USER.name;
  if (/^alex\s+rivera$/i.test(name)) return DEFAULT_USER.name;
  return name;
};

const normalizeEmail = (value) => {
  const email = String(value || "").trim();
  if (!email) return DEFAULT_USER.email;
  if (/^alex\.rivera@enterprise\.local$/i.test(email)) return DEFAULT_USER.email;
  return email;
};

const normalizeUser = (user) => ({
  id: user?.id || DEFAULT_USER.id,
  name: normalizeName(user?.name),
  email: normalizeEmail(user?.email),
  role: normalizeRole(user?.role),
  avatar: user?.avatar || DEFAULT_USER.avatar,
});

export const readStoredUser = () => {
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return normalizeUser(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const persistUser = (user) => {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizeUser(user)));
};

export const fetchCurrentUser = async () => {
  const storedUser = readStoredUser();
  if (storedUser) return storedUser;

  // Replace this fallback with real auth/session integration when backend is available.
  return normalizeUser(DEFAULT_USER);
};

export const getDefaultUser = () => normalizeUser(DEFAULT_USER);
