export const USER_ROLES = Object.freeze({
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
});

export const DEFAULT_PAGE = "dashboard";

export const NAV_ITEMS = Object.freeze([
  {
    icon: "dashboard",
    label: "Dashboard",
    page: "dashboard",
    roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE],
  },
  {
    icon: "bar_chart",
    label: "Sales Analytics",
    page: "sales",
    roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
  {
    icon: "trending_up",
    label: "Employee Performance",
    page: "performance",
    roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
  {
    icon: "account_balance_wallet",
    label: "Finance Overview",
    page: "finance",
    roles: [USER_ROLES.ADMIN],
  },
  {
    icon: "description",
    label: "Reports",
    page: "reports",
    roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE],
  },
]);

export const PAGE_TO_HASH = Object.freeze({
  dashboard: "#dashboard",
  sales: "#sales",
  performance: "#performance",
  finance: "#finance",
  reports: "#reports",
});

const HASH_TO_PAGE = Object.freeze({
  dashboard: "dashboard",
  sales: "sales",
  performance: "performance",
  "employee-performance": "performance",
  finance: "finance",
  "finance-overview": "finance",
  "financial-overview": "finance",
  reports: "reports",
});

export const normalizeHash = (hash) =>
  String(hash || "")
    .replace(/^#\/?/, "")
    .trim()
    .toLowerCase();

export const resolvePageFromHash = (hash) => HASH_TO_PAGE[normalizeHash(hash)] || null;

export const getPagesForRole = (role) =>
  NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => item.page);

export const canAccessPage = (role, page) =>
  NAV_ITEMS.some((item) => item.page === page && item.roles.includes(role));
