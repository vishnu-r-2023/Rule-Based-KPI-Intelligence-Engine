import PerformanceChartsSection from "../components/performance/PerformanceChartsSection";
import PerformanceHeader from "../components/performance/PerformanceHeader";
import PerformanceKpiGrid from "../components/performance/PerformanceKpiGrid";
import TopPerformersTable from "../components/performance/TopPerformersTable";
import WorkforceInsightsIntro from "../components/performance/WorkforceInsightsIntro";
import {
  departmentEfficiency,
  performanceKpis,
  productivityTrendData,
  topPerformers,
} from "../data/dashboardData";

function EmployeePerformancePage() {
  return (
    <div className="bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
      <PerformanceHeader />

      <div className="page-content mx-auto max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-10">
        <WorkforceInsightsIntro />
        <PerformanceKpiGrid items={performanceKpis} />
        <PerformanceChartsSection
          trendData={productivityTrendData}
          departments={departmentEfficiency}
        />
        <TopPerformersTable performers={topPerformers} />
      </div>
    </div>
  );
}

export default EmployeePerformancePage;
