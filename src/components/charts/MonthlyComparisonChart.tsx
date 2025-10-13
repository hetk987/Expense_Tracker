"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { MonthlySpendingData } from "@/types";
import {
  CHART_COLORS,
  getCommonChartOptions,
  getThemeColors,
} from "@/lib/chartConfig";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyComparisonChartProps {
  data: MonthlySpendingData[];
  title?: string;
  comparisonType?: "MoM" | "YoY" | "Budget";
}

export default function MonthlyComparisonChart({
  data,
  title = "Monthly Spending Comparison",
  comparisonType = "YoY",
}: MonthlyComparisonChartProps) {
  const isDark = useTheme();

  // Handle undefined or null data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No comparison data available
          </p>
        </div>
      </div>
    );
  }

  const validData = data.filter((item) => item && item.month);

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No valid comparison data available
          </p>
        </div>
      </div>
    );
  }

  const labels = validData.map((item) => item.month);

  const datasets = [];

  // Current year/period data
  datasets.push({
    label: comparisonType === "Budget" ? "Actual Spending" : "Current Year",
    data: validData.map((item) => Math.abs(item.currentYear)),
    backgroundColor: isDark
      ? CHART_COLORS.semantic.expense + "40"
      : CHART_COLORS.semantic.expense + "20",
    borderColor: CHART_COLORS.semantic.expense,
    borderWidth: 2,
    borderRadius: 6,
    borderSkipped: false,
  });

  // Comparison data
  if (
    comparisonType === "Budget" &&
    validData.some((item) => item.budgetAmount)
  ) {
    datasets.push({
      label: "Budget",
      data: validData.map((item) => item.budgetAmount || 0),
      backgroundColor: isDark
        ? CHART_COLORS.semantic.budget + "40"
        : CHART_COLORS.semantic.budget + "20",
      borderColor: CHART_COLORS.semantic.budget,
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    });
  } else {
    datasets.push({
      label: "Previous Year",
      data: validData.map((item) => Math.abs(item.previousYear)),
      backgroundColor: isDark
        ? CHART_COLORS.semantic.income + "40"
        : CHART_COLORS.semantic.income + "20",
      borderColor: CHART_COLORS.semantic.income,
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    });
  }

  const chartData = {
    labels,
    datasets,
  };

  const options: ChartOptions<"bar"> = {
    ...getCommonChartOptions(isDark),
    plugins: {
      ...getCommonChartOptions(isDark).plugins,
      legend: {
        position: "top" as const,
        labels: {
          color: getThemeColors(isDark).text.secondary,
          usePointStyle: true,
          font: {
            size: 13,
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            weight: 500,
          },
          padding: 20,
        },
      },
      tooltip: {
        ...getCommonChartOptions(isDark).plugins?.tooltip,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            const change =
              comparisonType === "Budget"
                ? ""
                : validData[context.dataIndex]?.currentYear &&
                  validData[context.dataIndex]?.previousYear
                ? ` (${
                    validData[context.dataIndex].currentYear >
                    validData[context.dataIndex].previousYear
                      ? "+"
                      : ""
                  }${(
                    ((validData[context.dataIndex].currentYear -
                      validData[context.dataIndex].previousYear) /
                      validData[context.dataIndex].previousYear) *
                    100
                  ).toFixed(1)}%)`
                : "";
            return `${label}: ${formatCurrency(value)}${change}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: getThemeColors(isDark).grid,
        },
        ticks: {
          color: getThemeColors(isDark).text.secondary,
          font: {
            size: 12,
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          padding: 8,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: getThemeColors(isDark).grid,
        },
        ticks: {
          color: getThemeColors(isDark).text.secondary,
          font: {
            size: 12,
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          padding: 8,
          callback: function (value: any) {
            return formatCurrency(value);
          },
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}

