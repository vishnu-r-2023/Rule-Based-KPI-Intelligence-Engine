import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  deleteDataset as deleteDatasetOnServer,
  clearDataset as clearDatasetOnServer,
  fetchAnalyticsBootstrap,
  switchDataset as switchDatasetOnServer,
  uploadDatasetFile,
} from "../services/analyticsApi";
import {
  DATE_RANGE_OPTIONS,
  KPI_ICON_MAP,
  REPORT_LIBRARY,
} from "../data/dashboardData";

const AnalyticsContext = createContext(null);

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (items, selector) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + selector(item), 0) / items.length;
};

const percent = (value) => `${value.toFixed(1)}%`;

const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const compactCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const number = (value, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);

const getDateRangeConfig = (dateRange) =>
  DATE_RANGE_OPTIONS.find((option) => option.value === dateRange) || DATE_RANGE_OPTIONS[1];

const getDateRangeDays = (dateRange) => {
  const parsed = Number(String(dateRange).replace(/[^0-9]/g, ""));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 90;
};

const getMonthLabels = (count) => {
  const labels = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    labels.push(
      monthDate.toLocaleDateString("en-US", {
        month: "short",
      })
    );
  }

  return labels;
};

const buildTrend = (current, baseline, options = {}) => {
  const { inverse = false } = options;

  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) {
    return {
      change: "0.0%",
      positive: true,
      comparison: "vs baseline",
    };
  }

  const rawChange = ((current - baseline) / baseline) * 100;
  const positive = inverse ? rawChange <= 0 : rawChange >= 0;

  return {
    change: `${rawChange >= 0 ? "+" : ""}${rawChange.toFixed(1)}%`,
    positive,
    comparison: "vs previous period",
  };
};

const EMPTY_META = {
  datasetId: null,
  fileName: "No dataset uploaded",
  uploadedAt: new Date().toISOString(),
  recordCount: 0,
  source: "empty",
  validationMessages: [],
  isActive: false,
};

export function AnalyticsProvider({ children }) {
  const [employees, setEmployees] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [validationMessages, setValidationMessages] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [dateRange, setDateRange] = useState(DATE_RANGE_OPTIONS[1].value);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportingDataset, setIsImportingDataset] = useState(false);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [datasetMeta, setDatasetMeta] = useState(EMPTY_META);

  const applyDatasetPayload = useCallback((payload) => {
    const nextEmployees = payload?.employees || [];
    const nextMeta = payload?.datasetMeta || EMPTY_META;

    setEmployees(nextEmployees);
    setPreviewRows(payload?.previewRows || []);
    setDatasetMeta(nextMeta);
    setValidationMessages(payload?.validationMessages || payload?.issues || []);
    setDatasets(payload?.datasets || []);
    setActiveDatasetId(payload?.activeDatasetId || nextMeta.datasetId || null);

    return nextEmployees;
  }, []);

  const loadFromServer = useCallback(async () => {
    setIsBootstrapLoading(true);

    try {
      const payload = await fetchAnalyticsBootstrap();
      return applyDatasetPayload(payload);
    } catch (error) {
      setValidationMessages([error.message || "Unable to load dataset from backend."]);
      setEmployees([]);
      setDatasets([]);
      setActiveDatasetId(null);
      setPreviewRows([]);
      setDatasetMeta(EMPTY_META);
      return [];
    } finally {
      setIsBootstrapLoading(false);
    }
  }, [applyDatasetPayload]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  const availableDepartments = useMemo(() => {
    const departments = Array.from(new Set(employees.map((employee) => employee.department))).sort(
      (left, right) => left.localeCompare(right)
    );

    return ["All Departments", ...departments];
  }, [employees]);

  useEffect(() => {
    if (!availableDepartments.includes(departmentFilter)) {
      setDepartmentFilter("All Departments");
    }
  }, [availableDepartments, departmentFilter]);

  const filteredEmployees = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const cutoffTimestamp = Date.now() - getDateRangeDays(dateRange) * DAY_IN_MS;

    return employees.filter((employee) => {
      const matchesDepartment =
        departmentFilter === "All Departments" || employee.department === departmentFilter;

      if (!matchesDepartment) {
        return false;
      }

      const recordTime = new Date(employee.recordDate || "").getTime();
      const matchesDate = Number.isFinite(recordTime) ? recordTime >= cutoffTimestamp : true;

      if (!matchesDate) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [employee.employeeId, employee.department, employee.jobRole]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [dateRange, departmentFilter, employees, searchQuery]);

  const baselineMetrics = useMemo(
    () => ({
      totalEmployees: employees.length,
      attritionRate:
        employees.length === 0
          ? 0
          : (employees.filter((employee) => employee.attrition).length / employees.length) * 100,
      averageSalary: average(employees, (employee) => employee.monthlyIncome),
      averageJobSatisfaction: average(employees, (employee) => employee.jobSatisfaction),
      averagePerformanceRating: average(employees, (employee) => employee.performanceRating),
      averageWorkLifeBalance: average(employees, (employee) => employee.workLifeBalance),
    }),
    [employees]
  );

  const currentMetrics = useMemo(
    () => ({
      totalEmployees: filteredEmployees.length,
      attritionRate:
        filteredEmployees.length === 0
          ? 0
          : (filteredEmployees.filter((employee) => employee.attrition).length /
              filteredEmployees.length) *
            100,
      averageSalary: average(filteredEmployees, (employee) => employee.monthlyIncome),
      averageJobSatisfaction: average(filteredEmployees, (employee) => employee.jobSatisfaction),
      averagePerformanceRating: average(filteredEmployees, (employee) => employee.performanceRating),
      averageWorkLifeBalance: average(filteredEmployees, (employee) => employee.workLifeBalance),
    }),
    [filteredEmployees]
  );

  const kpiCards = useMemo(() => {
    const totalEmployeeTrend = buildTrend(
      currentMetrics.totalEmployees,
      baselineMetrics.totalEmployees || currentMetrics.totalEmployees || 1
    );
    const attritionTrend = buildTrend(currentMetrics.attritionRate, baselineMetrics.attritionRate || 1, {
      inverse: true,
    });
    const salaryTrend = buildTrend(currentMetrics.averageSalary, baselineMetrics.averageSalary || 1);
    const satisfactionTrend = buildTrend(
      currentMetrics.averageJobSatisfaction,
      baselineMetrics.averageJobSatisfaction || 1
    );
    const performanceTrend = buildTrend(
      currentMetrics.averagePerformanceRating,
      baselineMetrics.averagePerformanceRating || 1
    );
    const workLifeTrend = buildTrend(
      currentMetrics.averageWorkLifeBalance,
      baselineMetrics.averageWorkLifeBalance || 1
    );

    return [
      {
        key: "totalEmployees",
        title: "Total Employees",
        value: number(currentMetrics.totalEmployees),
        icon: KPI_ICON_MAP.totalEmployees,
        trend: totalEmployeeTrend.change,
        trendPositive: totalEmployeeTrend.positive,
        comparison: totalEmployeeTrend.comparison,
      },
      {
        key: "attritionRate",
        title: "Attrition Rate",
        value: percent(currentMetrics.attritionRate),
        icon: KPI_ICON_MAP.attritionRate,
        trend: attritionTrend.change,
        trendPositive: attritionTrend.positive,
        comparison: attritionTrend.comparison,
      },
      {
        key: "averageSalary",
        title: "Average Salary",
        value: currency(currentMetrics.averageSalary),
        icon: KPI_ICON_MAP.averageSalary,
        trend: salaryTrend.change,
        trendPositive: salaryTrend.positive,
        comparison: salaryTrend.comparison,
      },
      {
        key: "averageJobSatisfaction",
        title: "Average Job Satisfaction",
        value: currentMetrics.averageJobSatisfaction.toFixed(2),
        icon: KPI_ICON_MAP.averageJobSatisfaction,
        trend: satisfactionTrend.change,
        trendPositive: satisfactionTrend.positive,
        comparison: satisfactionTrend.comparison,
      },
      {
        key: "averagePerformanceRating",
        title: "Average Performance Rating",
        value: currentMetrics.averagePerformanceRating.toFixed(2),
        icon: KPI_ICON_MAP.averagePerformanceRating,
        trend: performanceTrend.change,
        trendPositive: performanceTrend.positive,
        comparison: performanceTrend.comparison,
      },
      {
        key: "averageWorkLifeBalance",
        title: "Average Work-Life Balance",
        value: currentMetrics.averageWorkLifeBalance.toFixed(2),
        icon: KPI_ICON_MAP.averageWorkLifeBalance,
        trend: workLifeTrend.change,
        trendPositive: workLifeTrend.positive,
        comparison: workLifeTrend.comparison,
      },
    ];
  }, [baselineMetrics, currentMetrics]);

  const departmentDistribution = useMemo(() => {
    const grouped = new Map();

    filteredEmployees.forEach((employee) => {
      grouped.set(employee.department, (grouped.get(employee.department) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([department, count]) => ({
      department,
      count,
    }));
  }, [filteredEmployees]);

  const attritionByDepartment = useMemo(() => {
    const grouped = new Map();

    filteredEmployees.forEach((employee) => {
      if (!grouped.has(employee.department)) {
        grouped.set(employee.department, { department: employee.department, attritionCount: 0, total: 0 });
      }

      const bucket = grouped.get(employee.department);
      bucket.total += 1;
      if (employee.attrition) {
        bucket.attritionCount += 1;
      }
    });

    return Array.from(grouped.values()).map((bucket) => ({
      department: bucket.department,
      attritionCount: bucket.attritionCount,
      attritionRate: bucket.total === 0 ? 0 : Number(((bucket.attritionCount / bucket.total) * 100).toFixed(1)),
      totalEmployees: bucket.total,
    }));
  }, [filteredEmployees]);

  const ageDistribution = useMemo(() => {
    const bins = [
      { label: "18-24", min: 18, max: 24 },
      { label: "25-34", min: 25, max: 34 },
      { label: "35-44", min: 35, max: 44 },
      { label: "45-54", min: 45, max: 54 },
      { label: "55+", min: 55, max: 99 },
    ];

    return bins.map((bin) => ({
      ageGroup: bin.label,
      employees: filteredEmployees.filter((employee) => employee.age >= bin.min && employee.age <= bin.max)
        .length,
    }));
  }, [filteredEmployees]);

  const salaryDistribution = useMemo(() => {
    const bands = [
      { label: "<4K", min: 0, max: 3999 },
      { label: "4K-6K", min: 4000, max: 5999 },
      { label: "6K-8K", min: 6000, max: 7999 },
      { label: "8K-10K", min: 8000, max: 9999 },
      { label: "10K+", min: 10000, max: Number.POSITIVE_INFINITY },
    ];

    return bands.map((band) => ({
      range: band.label,
      employees: filteredEmployees.filter(
        (employee) => employee.monthlyIncome >= band.min && employee.monthlyIncome <= band.max
      ).length,
    }));
  }, [filteredEmployees]);

  const experienceVsPerformance = useMemo(
    () =>
      filteredEmployees.map((employee) => ({
        employeeId: employee.employeeId,
        department: employee.department,
        yearsExperience: employee.yearsExperience,
        performanceRating: employee.performanceRating,
        monthlyIncome: employee.monthlyIncome,
      })),
    [filteredEmployees]
  );

  const performanceRatingDistribution = useMemo(() => {
    const ratingBuckets = [1, 2, 3, 4, 5];

    return ratingBuckets.map((rating) => ({
      rating: String(rating),
      employees: filteredEmployees.filter(
        (employee) => Math.round(employee.performanceRating) === rating
      ).length,
    }));
  }, [filteredEmployees]);

  const jobSatisfactionLevels = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5];

    return buckets.map((score) => ({
      score: String(score),
      employees: filteredEmployees.filter(
        (employee) => Math.round(employee.jobSatisfaction) === score
      ).length,
    }));
  }, [filteredEmployees]);

  const workLifeBalanceLevels = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5];

    return buckets.map((score) => ({
      score: String(score),
      employees: filteredEmployees.filter(
        (employee) => Math.round(employee.workLifeBalance) === score
      ).length,
    }));
  }, [filteredEmployees]);

  const departmentPerformanceComparison = useMemo(() => {
    const grouped = new Map();

    filteredEmployees.forEach((employee) => {
      if (!grouped.has(employee.department)) {
        grouped.set(employee.department, []);
      }
      grouped.get(employee.department).push(employee);
    });

    return Array.from(grouped.entries())
      .map(([department, members]) => {
        const avgPerformance = average(members, (member) => member.performanceRating);
        const avgSatisfaction = average(members, (member) => member.jobSatisfaction);
        const avgWorkLife = average(members, (member) => member.workLifeBalance);

        return {
          department,
          headcount: members.length,
          performance: Number(avgPerformance.toFixed(2)),
          satisfaction: Number(avgSatisfaction.toFixed(2)),
          workLifeBalance: Number(avgWorkLife.toFixed(2)),
          productivity: Number((avgPerformance * 20).toFixed(1)),
        };
      })
      .sort((left, right) => right.productivity - left.productivity);
  }, [filteredEmployees]);

  const radarPerformanceIndicators = useMemo(() => {
    const attritionRate = currentMetrics.attritionRate;
    const compensationIndex =
      baselineMetrics.averageSalary === 0
        ? 50
        : Math.min(Math.max((currentMetrics.averageSalary / baselineMetrics.averageSalary) * 100, 0), 130);

    return [
      {
        metric: "Performance",
        score: Number((currentMetrics.averagePerformanceRating * 20).toFixed(1)),
      },
      {
        metric: "Satisfaction",
        score: Number((currentMetrics.averageJobSatisfaction * 20).toFixed(1)),
      },
      {
        metric: "Work-Life",
        score: Number((currentMetrics.averageWorkLifeBalance * 20).toFixed(1)),
      },
      {
        metric: "Retention",
        score: Number((100 - attritionRate).toFixed(1)),
      },
      {
        metric: "Compensation",
        score: Number(compensationIndex.toFixed(1)),
      },
    ];
  }, [baselineMetrics.averageSalary, currentMetrics]);

  const leaderboardRows = useMemo(() => {
    const sorted = [...filteredEmployees].sort((left, right) => {
      const leftScore = left.performanceRating * 0.5 + left.jobSatisfaction * 0.3 + left.workLifeBalance * 0.2;
      const rightScore =
        right.performanceRating * 0.5 + right.jobSatisfaction * 0.3 + right.workLifeBalance * 0.2;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return right.monthlyIncome - left.monthlyIncome;
    });

    return sorted.slice(0, 12).map((employee) => ({
      employeeId: employee.employeeId,
      jobRole: employee.jobRole,
      department: employee.department,
      performanceRating: employee.performanceRating,
      jobSatisfaction: employee.jobSatisfaction,
    }));
  }, [filteredEmployees]);

  const activeDateRange = useMemo(() => getDateRangeConfig(dateRange), [dateRange]);

  const salesByDepartment = useMemo(() => {
    const grouped = new Map();

    filteredEmployees.forEach((employee) => {
      if (!grouped.has(employee.department)) {
        grouped.set(employee.department, []);
      }
      grouped.get(employee.department).push(employee);
    });

    return Array.from(grouped.entries())
      .map(([department, members]) => {
        const averageIncome = average(members, (member) => member.monthlyIncome);
        const averagePerformance = average(members, (member) => member.performanceRating);
        const annualRevenue = members.length * averageIncome * (1.1 + averagePerformance / 5) * 12;

        return {
          department,
          revenue: Math.round(annualRevenue),
          headcount: members.length,
        };
      })
      .sort((left, right) => right.revenue - left.revenue);
  }, [filteredEmployees]);

  const totalSalesRevenue = useMemo(
    () => salesByDepartment.reduce((sum, item) => sum + item.revenue, 0),
    [salesByDepartment]
  );

  const monthlyRevenueTrend = useMemo(() => {
    const monthLabels = getMonthLabels(activeDateRange.months);
    const modifiers = [0.84, 0.9, 0.97, 1.04, 1.09, 1.13, 1.06, 1.11, 1.17, 1.08, 1.15, 1.2];
    const baseMonthlyRevenue = totalSalesRevenue / 12;

    return monthLabels.map((month, index) => {
      const modifier = modifiers[index % modifiers.length];
      const revenue = Math.round(baseMonthlyRevenue * modifier);

      return {
        month,
        revenue,
        target: Math.round(revenue * 1.08),
      };
    });
  }, [activeDateRange.months, totalSalesRevenue]);

  const revenueContribution = useMemo(
    () =>
      salesByDepartment.map((item) => ({
        department: item.department,
        revenue: item.revenue,
      })),
    [salesByDepartment]
  );

  const totalExpensesAnnual = useMemo(
    () => filteredEmployees.reduce((sum, employee) => sum + employee.monthlyIncome * 12 * 1.28, 0),
    [filteredEmployees]
  );

  const financeRevenueExpensesTrend = useMemo(() => {
    const expenseModifiers = [0.94, 0.96, 0.99, 1.01, 1.04, 1.06, 1.05, 1.07, 1.08, 1.1, 1.12, 1.14];
    const baseMonthlyExpense = totalExpensesAnnual / 12;

    return monthlyRevenueTrend.map((monthData, index) => {
      const expenses = Math.round(baseMonthlyExpense * expenseModifiers[index % expenseModifiers.length]);
      const profit = monthData.revenue - expenses;
      const profitMargin = monthData.revenue === 0 ? 0 : (profit / monthData.revenue) * 100;

      return {
        month: monthData.month,
        revenue: monthData.revenue,
        expenses,
        profit,
        profitMargin: Number(profitMargin.toFixed(1)),
      };
    });
  }, [monthlyRevenueTrend, totalExpensesAnnual]);

  const budgetAllocationByDepartment = useMemo(
    () =>
      salesByDepartment.map((item) => {
        const personnelBudget = item.revenue * 0.36;
        const trainingBudget = item.revenue * 0.08;
        const operationsBudget = item.revenue * 0.16;

        return {
          department: item.department,
          personnelBudgetK: Number((personnelBudget / 1000).toFixed(1)),
          trainingBudgetK: Number((trainingBudget / 1000).toFixed(1)),
          operationsBudgetK: Number((operationsBudget / 1000).toFixed(1)),
          totalBudgetK: Number(((personnelBudget + trainingBudget + operationsBudget) / 1000).toFixed(1)),
        };
      }),
    [salesByDepartment]
  );

  const financeKpis = useMemo(() => {
    const netProfit = totalSalesRevenue - totalExpensesAnnual;
    const profitMargin = totalSalesRevenue === 0 ? 0 : (netProfit / totalSalesRevenue) * 100;

    return {
      revenue: totalSalesRevenue,
      expenses: totalExpensesAnnual,
      netProfit,
      profitMargin,
    };
  }, [totalExpensesAnnual, totalSalesRevenue]);

  const ppfFrontier = useMemo(() => {
    if (filteredEmployees.length === 0) {
      return {
        hasData: false,
        frontierData: [],
        operatingPoint: [],
        hrMax: 0,
        businessMax: 0,
      };
    }

    const hrCapacityMax = clamp(
      currentMetrics.averageWorkLifeBalance * 18 + (100 - currentMetrics.attritionRate) * 0.52,
      55,
      130
    );

    const businessCapacityMax = clamp(
      currentMetrics.averagePerformanceRating * 18 +
        currentMetrics.averageJobSatisfaction * 14 +
        (financeKpis.profitMargin > 0 ? financeKpis.profitMargin * 0.8 : 0),
      50,
      140
    );

    const frontierData = Array.from({ length: 11 }, (_, index) => {
      const hrCapability = Number(((hrCapacityMax / 10) * index).toFixed(1));
      const utilization = hrCapacityMax === 0 ? 0 : hrCapability / hrCapacityMax;
      const businessOutput = Number(
        Math.max(0, businessCapacityMax * (1 - Math.pow(utilization, 1.85))).toFixed(1)
      );

      return {
        hrCapability,
        businessOutput,
      };
    });

    const operatingHr = clamp(
      currentMetrics.averageWorkLifeBalance * 18 + (100 - currentMetrics.attritionRate) * 0.32,
      10,
      hrCapacityMax * 0.96
    );

    const frontierAtOperating =
      businessCapacityMax * (1 - Math.pow(operatingHr / hrCapacityMax, 1.85));

    const rawOperatingBusiness = clamp(
      (financeKpis.revenue <= 0
        ? 0
        : (financeKpis.netProfit / Math.max(financeKpis.revenue, 1)) * businessCapacityMax) +
        currentMetrics.averagePerformanceRating * 8 +
        currentMetrics.averageJobSatisfaction * 5,
      4,
      businessCapacityMax
    );

    const operatingPoint = [
      {
        name: "Current operating point",
        hrCapability: Number(operatingHr.toFixed(1)),
        businessOutput: Number(Math.min(rawOperatingBusiness, frontierAtOperating * 0.92).toFixed(1)),
      },
    ];

    return {
      hasData: true,
      frontierData,
      operatingPoint,
      hrMax: Number(hrCapacityMax.toFixed(1)),
      businessMax: Number(businessCapacityMax.toFixed(1)),
    };
  }, [
    filteredEmployees.length,
    currentMetrics.attritionRate,
    currentMetrics.averageJobSatisfaction,
    currentMetrics.averagePerformanceRating,
    currentMetrics.averageWorkLifeBalance,
    financeKpis.netProfit,
    financeKpis.profitMargin,
    financeKpis.revenue,
  ]);

  const reportsRows = useMemo(() => {
    const now = new Date();

    return REPORT_LIBRARY.map((report, index) => {
      const generatedAt = new Date(now.getTime() - index * 36 * 60 * 60 * 1000);

      return {
        id: report.id,
        reportName: report.name,
        description: report.description,
        records: filteredEmployees.length,
        generatedAt: generatedAt.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Ready",
      };
    });
  }, [filteredEmployees.length]);

  const reportInsights = useMemo(() => {
    const topDepartment = departmentPerformanceComparison[0];

    return [
      `${number(currentMetrics.totalEmployees)} active employee records in current view.`,
      topDepartment
        ? `${topDepartment.department} leads with a productivity score of ${topDepartment.productivity.toFixed(
            1
          )}.`
        : "No department performance data is available.",
      `Current attrition rate is ${percent(currentMetrics.attritionRate)}, with salary average at ${currency(
        currentMetrics.averageSalary
      )}.`,
    ];
  }, [currentMetrics, departmentPerformanceComparison]);

  const importDataset = useCallback(async (file) => {
    if (!file) {
      return {
        success: false,
        issues: ["Select a CSV or Excel file before importing."],
        count: 0,
      };
    }

    setIsImportingDataset(true);

    try {
      const response = await uploadDatasetFile(file);
      applyDatasetPayload(response);

      return {
        success: true,
        issues: response.issues || response.validationMessages || [],
        count: response.count || (response.employees || []).length || 0,
      };
    } catch (error) {
      const issues = error?.payload?.issues || [error.message || "Dataset import failed."];
      if (Array.isArray(error?.payload?.previewRows)) {
        setPreviewRows(error.payload.previewRows);
      }
      setValidationMessages(issues);

      return {
        success: false,
        issues,
        count: 0,
      };
    } finally {
      setIsImportingDataset(false);
    }
  }, [applyDatasetPayload]);

  const clearDataset = useCallback(async () => {
    try {
      const payload = await clearDatasetOnServer();
      applyDatasetPayload(payload);
      setDepartmentFilter("All Departments");
      setSearchQuery("");
      return true;
    } catch (error) {
      setValidationMessages([error.message || "Failed to clear dataset."]);
      return false;
    }
  }, [applyDatasetPayload]);

  const switchDataset = useCallback(
    async (datasetId) => {
      const normalizedDatasetId = String(datasetId || "").trim();
      if (!normalizedDatasetId || normalizedDatasetId === activeDatasetId) {
        return true;
      }

      try {
        const payload = await switchDatasetOnServer(normalizedDatasetId);
        applyDatasetPayload(payload);
        setDepartmentFilter("All Departments");
        setSearchQuery("");
        return true;
      } catch (error) {
        setValidationMessages([error.message || "Failed to switch dataset."]);
        return false;
      }
    },
    [activeDatasetId, applyDatasetPayload]
  );

  const removeDataset = useCallback(
    async (datasetId) => {
      const normalizedDatasetId = String(datasetId || "").trim();
      if (!normalizedDatasetId) {
        return false;
      }

      try {
        const payload = await deleteDatasetOnServer(normalizedDatasetId);
        applyDatasetPayload(payload);
        setDepartmentFilter("All Departments");
        setSearchQuery("");
        return true;
      } catch (error) {
        setValidationMessages([error.message || "Failed to remove dataset."]);
        return false;
      }
    },
    [applyDatasetPayload]
  );

  const value = useMemo(
    () => ({
      employees,
      datasets,
      activeDatasetId,
      filteredEmployees,
      availableDepartments,
      departmentFilter,
      setDepartmentFilter,
      dateRange,
      setDateRange,
      searchQuery,
      setSearchQuery,
      datasetMeta,
      previewRows,
      validationMessages,
      isImportingDataset,
      isBootstrapLoading,
      importDataset,
      clearDataset,
      switchDataset,
      removeDataset,
      refreshDataset: loadFromServer,
      activeDateRange,
      kpiCards,
      currentMetrics,
      departmentDistribution,
      attritionByDepartment,
      ageDistribution,
      salaryDistribution,
      experienceVsPerformance,
      performanceRatingDistribution,
      jobSatisfactionLevels,
      workLifeBalanceLevels,
      departmentPerformanceComparison,
      radarPerformanceIndicators,
      leaderboardRows,
      totalSalesRevenue,
      monthlyRevenueTrend,
      salesByDepartment,
      revenueContribution,
      financeKpis,
      financeRevenueExpensesTrend,
      budgetAllocationByDepartment,
      ppfFrontier,
      reportsRows,
      reportInsights,
      formatters: {
        currency,
        compactCurrency,
        number,
        percent,
      },
    }),
    [
      employees,
      datasets,
      activeDatasetId,
      filteredEmployees,
      availableDepartments,
      departmentFilter,
      dateRange,
      searchQuery,
      datasetMeta,
      previewRows,
      validationMessages,
      isImportingDataset,
      isBootstrapLoading,
      importDataset,
      clearDataset,
      switchDataset,
      removeDataset,
      loadFromServer,
      activeDateRange,
      kpiCards,
      currentMetrics,
      departmentDistribution,
      attritionByDepartment,
      ageDistribution,
      salaryDistribution,
      experienceVsPerformance,
      performanceRatingDistribution,
      jobSatisfactionLevels,
      workLifeBalanceLevels,
      departmentPerformanceComparison,
      radarPerformanceIndicators,
      leaderboardRows,
      totalSalesRevenue,
      monthlyRevenueTrend,
      salesByDepartment,
      revenueContribution,
      financeKpis,
      financeRevenueExpensesTrend,
      budgetAllocationByDepartment,
      ppfFrontier,
      reportsRows,
      reportInsights,
    ]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  }

  return context;
}
