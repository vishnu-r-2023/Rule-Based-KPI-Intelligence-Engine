import FinanceChartsSection from "../components/finance/FinanceChartsSection";
import FinanceHeader from "../components/finance/FinanceHeader";
import FinanceKpiGrid from "../components/finance/FinanceKpiGrid";
import FinanceOverviewTopRow from "../components/finance/FinanceOverviewTopRow";
import TransactionsTable from "../components/finance/TransactionsTable";
import {
  budgetAllocation,
  financeKpis,
  financeTransactions,
  revenueExpenseBars,
} from "../data/dashboardData";

function FinanceOverviewPage() {
  return (
    <>
      <FinanceHeader />

      <div className="page-content mx-auto max-w-[1600px] space-y-8 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <FinanceOverviewTopRow />
        <FinanceKpiGrid items={financeKpis} />
        <FinanceChartsSection bars={revenueExpenseBars} budget={budgetAllocation} />
        <TransactionsTable transactions={financeTransactions} />
      </div>
    </>
  );
}

export default FinanceOverviewPage;
