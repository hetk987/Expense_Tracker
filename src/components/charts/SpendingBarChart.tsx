"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { TimeSeriesData } from "@/types";
import {
  CHART_COLORS,
  getCommonChartOptions,
  getThemeColors,
} from "@/lib/chartConfig";
import { useTheme } from "@/hooks/useTheme";
import { BarChart } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SpendingBarChartProps {
  data: TimeSeriesData[];
  title?: string;
}

export default function SpendingBarChart({
  data,
  title = "Spending Over Time",
}: SpendingBarChartProps) {
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
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
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
      item && item.date && typeof item.amount === "number" && item.amount >= 0
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
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
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
    labels: validData.map((item) => item.date),
    datasets: [
      {
        label: "Daily Spending",
        data: validData.map((item) => Math.abs(item.amount)),
        borderColor: CHART_COLORS.semantic.expense,
        backgroundColor: isDark
          ? CHART_COLORS.semantic.expense + "20"
          : CHART_COLORS.semantic.expense + "10",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: CHART_COLORS.semantic.expense,
        pointBorderColor: isDark ? "#1F2937" : "#FFFFFF",
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: CHART_COLORS.semantic.expense,
        pointHoverBorderColor: isDark ? "#374151" : "#F3F4F6",
        pointHoverBorderWidth: 4,
      },
    ],
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
