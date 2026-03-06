import { memo, useMemo } from "react";
import ThemeToggle from "../common/ThemeToggle";
import UserProfileBadge from "../common/UserProfileBadge";
import { NAV_ITEMS } from "../../config/navigation";
import { useUser } from "../../context/UserContext";

function Sidebar({ activePage = "dashboard", onNavigate = () => {} }) {
  const { user } = useUser();

  const allowedNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(user.role)),
    [user.role]
  );

  return (
    <aside className="sidebar-glass w-full shrink-0 border-b border-white/20 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 p-6 sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <span className="material-symbols-outlined font-bold">analytics</span>
        </div>
        <div>
          <h1 className="leading-tight text-lg font-bold tracking-tight">
            Enterprise
          </h1>
          <p className="text-primary text-xs font-medium uppercase tracking-wider">
            Analytics Platform
          </p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-2 px-4 pb-4 lg:mt-4 lg:pb-0">
        {allowedNavItems.map((item) => (
          <a
            key={item.label}
            href={item.page ? `#${item.page}` : "#"}
            onClick={(event) => {
              event.preventDefault();
              if (item.page) {
                onNavigate(item.page);
              }
            }}
            aria-current={item.page === activePage ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
              item.page === activePage
                ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-primary/20"
                : "text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="space-y-4 border-t border-white/20 p-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/50 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Theme
          </span>
          <ThemeToggle />
        </div>

        <div className="rounded-xl border border-slate-200/60 bg-white/50 p-3 dark:border-slate-700/60 dark:bg-slate-900/50">
          <UserProfileBadge compact />
        </div>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
