"use client";

import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  ChartOptions,
} from "chart.js";
import { CategoryData } from "@/types";
import {
  CHART_COLORS,
  getCommonChartOptions,
  getThemeColors,
} from "@/lib/chartConfig";
import { useTheme } from "@/hooks/useTheme";
import { useEffect, useRef } from "react";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

interface CategoryPieChartProps {
  data: CategoryData[];
  title?: string;
}

export default function CategoryPieChart({
  data,
  title = "Spending by Category",
}: CategoryPieChartProps) {
  const isDark = useTheme();
  const chartRef = useRef<ChartJS<"pie"> | null>(null);

  // Force update legend colors when theme changes
  useEffect(() => {
    if (chartRef.current) {
      // Force chart update to apply new colors
      chartRef.current.update();
    }
  }, [isDark]);

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
        data: validData.map((item) => Math.abs(item.amount)),
        backgroundColor: CHART_COLORS.primary.slice(0, validData.length),
        borderWidth: 3,
        borderColor: isDark ? "#1F2937" : "#FFFFFF",
        hoverBorderWidth: 4,
        hoverBorderColor: isDark ? "#374151" : "#F3F4F6",
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: getThemeColors(isDark).legend.text,
          padding: 24,
          usePointStyle: true,
          font: {
            size: 13,
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            weight: 500,
          },
        },
      },
      tooltip: {
        backgroundColor: getThemeColors(isDark).tooltip.background,
        titleColor: getThemeColors(isDark).tooltip.text,
        bodyColor: getThemeColors(isDark).text.secondary,
        borderColor: getThemeColors(isDark).tooltip.border,
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 600,
          family:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        bodyFont: {
          size: 13,
          family:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          },
        },
      },
    },
    elements: {
      arc: {
        borderWidth: 3,
        borderColor: isDark ? "#1F2937" : "#FFFFFF",
        hoverBorderWidth: 4,
        hoverBorderColor: isDark ? "#374151" : "#F3F4F6",
      },
    },
    animation: {
      onComplete: () => {
        // Manually update legend colors after animation completes
        setTimeout(() => {
          const legendItems = document.querySelectorAll(".chartjs-legend-item");
          legendItems.forEach((item) => {
            if (item instanceof HTMLElement) {
              item.style.color = getThemeColors(isDark).legend.text;
            }
          });
        }, 100);
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Pie data={chartData} options={options} ref={chartRef} />
    </div>
  );
}
