import SalesDetailsGrid from "../components/sales/SalesDetailsGrid";
import SalesHeader from "../components/sales/SalesHeader";
import SalesKpiGrid from "../components/sales/SalesKpiGrid";
import SalesTrendChart from "../components/sales/SalesTrendChart";
import {
  regionalDistribution,
  regionalMapImage,
  salesKpis,
  salesMonths,
  topProducts,
} from "../data/dashboardData";

function SalesAnalyticsPage() {
  return (
    <>
      <SalesHeader />

      <div className="page-content mx-auto max-w-[1600px] space-y-8 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <SalesKpiGrid items={salesKpis} />
        <SalesTrendChart months={salesMonths} />
        <SalesDetailsGrid
          regions={regionalDistribution}
          mapImage={regionalMapImage}
          products={topProducts}
        />
      </div>
    </>
  );
}

export default SalesAnalyticsPage;
