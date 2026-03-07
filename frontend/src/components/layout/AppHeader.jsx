import { memo, useMemo } from "react";
import { DATE_RANGE_OPTIONS } from "../../data/dashboardData";
import { useAnalytics } from "../../context/AnalyticsContext";
import { useUser } from "../../context/UserContext";
import UserAvatarFallbackIcon from "../common/UserAvatarFallbackIcon";

const PAGE_TITLES = {
  dashboard: "Business Analytics Dashboard",
  sales: "Sales Analytics",
  performance: "Employee Performance",
  finance: "Finance Overview",
  reports: "Reports",
  upload: "Dataset Upload",
  profile: "User Profile",
};

function AppHeader({ activePage = "dashboard", onNavigate = () => {} }) {
  const {
    searchQuery,
    setSearchQuery,
    departmentFilter,
    setDepartmentFilter,
    availableDepartments,
    dateRange,
    setDateRange,
    datasetMeta,
  } = useAnalytics();

  const { user } = useUser();

  const pageTitle = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;
  const isProfilePage = activePage === "profile";

  const uploadedLabel = useMemo(() => {
    const date = new Date(datasetMeta.uploadedAt);

    return `${datasetMeta.recordCount} records | ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }, [datasetMeta.recordCount, datasetMeta.uploadedAt]);

  return (
    <header className="dashboard-topbar sticky top-2 z-30 px-4 py-4 backdrop-blur-sm transition sm:top-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Active dataset: {datasetMeta.fileName} | {uploadedLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate("upload")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Dataset Upload
            </button>

            <button
              type="button"
              onClick={() => onNavigate("profile")}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
              title={`${user.name} (${user.role})`}
              aria-label="User profile"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserAvatarFallbackIcon className="h-5 w-5 text-slate-700 dark:text-slate-100" />
              )}
            </button>
          </div>
        </div>

        {!isProfilePage && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
          <label className="relative">
            <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by employee ID, department, or job role"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Department
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {availableDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Date Range
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          </div>
        )}
      </div>
    </header>
  );
}

export default memo(AppHeader);
