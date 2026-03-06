import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import PageLoader from "./components/common/PageLoader";
import Sidebar from "./components/layout/Sidebar";
import {
  canAccessPage,
  DEFAULT_PAGE,
  getPagesForRole,
  PAGE_TO_HASH,
  resolvePageFromHash,
} from "./config/navigation";
import { useUser } from "./context/UserContext";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const SalesAnalyticsPage = lazy(() => import("./pages/SalesAnalyticsPage"));
const EmployeePerformancePage = lazy(() => import("./pages/EmployeePerformancePage"));
const FinanceOverviewPage = lazy(() => import("./pages/FinanceOverviewPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));

const pageToComponentMap = {
  dashboard: OverviewPage,
  sales: SalesAnalyticsPage,
  performance: EmployeePerformancePage,
  finance: FinanceOverviewPage,
  reports: ReportsPage,
};

const resolveAccessiblePage = (hash, role, fallbackPage) => {
  const resolvedPage = resolvePageFromHash(hash);
  if (resolvedPage && canAccessPage(role, resolvedPage)) {
    return resolvedPage;
  }
  return fallbackPage;
};

function App() {
  const { isUserLoading, user } = useUser();

  const availablePages = useMemo(() => {
    const pages = getPagesForRole(user.role);
    return pages.length ? pages : [DEFAULT_PAGE];
  }, [user.role]);

  const defaultPage = availablePages[0];

  const [activePage, setActivePage] = useState(() =>
    resolvePageFromHash(window.location.hash) || DEFAULT_PAGE
  );

  const handleNavigate = useCallback(
    (page) => {
      if (!canAccessPage(user.role, page)) return;
      setActivePage(page);
      window.location.hash = PAGE_TO_HASH[page] || PAGE_TO_HASH[defaultPage];
    },
    [defaultPage, user.role]
  );

  useEffect(() => {
    if (isUserLoading) return;

    const safePage = resolveAccessiblePage(window.location.hash, user.role, defaultPage);
    setActivePage((currentPage) => (currentPage === safePage ? currentPage : safePage));

    const nextHash = PAGE_TO_HASH[safePage] || PAGE_TO_HASH[defaultPage];
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [defaultPage, isUserLoading, user.role]);

  useEffect(() => {
    const onHashChange = () => {
      const nextPage = resolveAccessiblePage(window.location.hash, user.role, defaultPage);
      setActivePage((currentPage) => (currentPage === nextPage ? currentPage : nextPage));

      const nextHash = PAGE_TO_HASH[nextPage] || PAGE_TO_HASH[defaultPage];
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultPage, user.role]);

  const ActivePageComponent = useMemo(
    () => pageToComponentMap[activePage] || OverviewPage,
    [activePage]
  );

  if (isUserLoading) {
    return (
      <div className="app-shell min-h-screen">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <div className="app-layout flex min-h-screen flex-col overflow-hidden lg:h-screen lg:flex-row">
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />

        <main className="app-main flex-1 overflow-x-hidden overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            <ActivePageComponent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
