import BottomSection from "../components/dashboard/BottomSection";
import ChartsSection from "../components/dashboard/ChartsSection";
import KpiGrid from "../components/dashboard/KpiGrid";
import DashboardHeader from "../components/layout/DashboardHeader";
import { departments, insights, kpis, staffMembers } from "../data/dashboardData";

function OverviewPage() {
  return (
    <>
      <DashboardHeader />

      <div className="page-content mx-auto max-w-[1600px] space-y-8 px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
        <KpiGrid kpis={kpis} />
        <ChartsSection departments={departments} />
        <BottomSection staffMembers={staffMembers} insights={insights} />
      </div>
    </>
  );
}

export default OverviewPage;
