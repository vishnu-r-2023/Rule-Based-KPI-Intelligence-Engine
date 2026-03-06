import RecentReportsTable from "../components/reports/RecentReportsTable";
import ReportsHeader from "../components/reports/ReportsHeader";
import ReportTemplatesSection from "../components/reports/ReportTemplatesSection";
import { recentReports, reportTemplates } from "../data/dashboardData";

function ReportsPage() {
  return (
    <>
      <ReportsHeader />

      <div className="page-content mx-auto max-w-[1600px] space-y-8 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              Reports Management
            </h2>
            <p className="mt-1 text-slate-500">
              Manage, generate, and track your business performance reports.
            </p>
          </div>
          <button className="flex items-center gap-2 self-start rounded-full bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] sm:self-auto">
            <span className="material-symbols-outlined">add</span>
            Generate New Report
          </button>
        </section>

        <ReportTemplatesSection templates={reportTemplates} />
        <RecentReportsTable reports={recentReports} />
      </div>
    </>
  );
}

export default ReportsPage;
