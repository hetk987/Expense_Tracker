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
import { CategoryData } from "@/types";
import {
  CHART_COLORS,
  getCommonChartOptions,
  getThemeColors,
} from "@/lib/chartConfig";
import { useTheme } from "@/hooks/useTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CategoryBarChartProps {
  data: CategoryData[];
  title?: string;
}

export default function CategoryBarChart({
  data,
  title = "Spending by Category",
}: CategoryBarChartProps) {
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
            No data available
          </p>
        </div>
      </div>
    );
  }

  // Ensure data is valid and has positive amounts
  const validData = data.filter(
    (item) =>
      item &&
      item.category &&
      typeof item.amount === "number" &&
      item.amount > 0
  );

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
            No valid data available
          </p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: validData.map((item) => item.category),
    datasets: [
      {
        label: "Amount ($)",
        data: validData.map((item) => Math.abs(item.amount)),
        backgroundColor: CHART_COLORS.primary
          .slice(0, validData.length)
          .map((color) => (isDark ? color + "40" : color + "20")),
        borderColor: CHART_COLORS.primary.slice(0, validData.length),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: CHART_COLORS.primary
          .slice(0, validData.length)
          .map((color) => (isDark ? color + "60" : color + "40")),
        hoverBorderColor: CHART_COLORS.primary.slice(0, validData.length),
        hoverBorderWidth: 3,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    ...getCommonChartOptions(isDark),
    plugins: {
      ...getCommonChartOptions(isDark).plugins,
      legend: {
        display: false,
      },
      tooltip: {
        ...getCommonChartOptions(isDark).plugins?.tooltip,
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed.y || context.parsed || 0;
            return `${label}: $${
              typeof value === "number" ? value.toFixed(2) : "0.00"
            }`;
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
          maxRotation: 45,
          minRotation: 0,
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
            return `$${typeof value === "number" ? value.toFixed(0) : "0"}`;
          },
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
