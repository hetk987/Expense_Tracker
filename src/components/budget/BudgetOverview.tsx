"use client";

import { useState, useEffect } from "react";
import { BudgetProgress, BudgetSummary } from "@/types";
import { budgetApi } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/lib/utils";
import {
  Target,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Calendar,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface BudgetOverviewProps {
  className?: string;
}

export default function BudgetOverview({
  className = "",
}: BudgetOverviewProps) {
  const isDark = useTheme();
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      const [progressData, summaryData] = await Promise.all([
        budgetApi.getAllBudgetProgress(),
        budgetApi.getBudgetSummary(),
      ]);

      setBudgetProgress(progressData);
      setBudgetSummary(summaryData);
    } catch (error) {
      console.error("Error loading budget overview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`${className} bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!budgetSummary || budgetProgress.length === 0) {
    return (
      <div
        className={`${className} bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Budget Overview
          </h3>
          <Link
            href="/budgets"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            View All
          </Link>
        </div>

        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-gray-900 dark:text-gray-100 font-medium mb-2">
            No budgets created yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Create budgets to track your spending and stay on top of your
            finances
          </p>
          <Link
            href="/budgets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Budget
          </Link>
        </div>
      </div>
    );
  }

  // Get top 3 budgets to display (prioritize over budget, then warning, then highest percentage)
  const prioritizedBudgets = [...budgetProgress]
    .sort((a, b) => {
      if (a.isOverBudget && !b.isOverBudget) return -1;
      if (!a.isOverBudget && b.isOverBudget) return 1;

      const aWarning = a.percentage >= a.budget.alertThreshold;
      const bWarning = b.percentage >= b.budget.alertThreshold;

      if (aWarning && !bWarning) return -1;
      if (!aWarning && bWarning) return 1;

      return b.percentage - a.percentage;
    })
    .slice(0, 3);

  const getStatusColor = (progress: BudgetProgress) => {
    if (progress.isOverBudget) {
      return "text-red-600 dark:text-red-400";
    } else if (progress.percentage >= progress.budget.alertThreshold) {
      return "text-yellow-600 dark:text-yellow-400";
    } else {
      return "text-green-600 dark:text-green-400";
    }
  };

  const getProgressBarColor = (progress: BudgetProgress) => {
    if (progress.isOverBudget) return "bg-red-500";
    if (progress.percentage >= progress.budget.alertThreshold)
      return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div
      className={`${className} bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Budget Overview
        </h3>
        <Link
          href="/budgets"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {budgetSummary.activeBudgets}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {budgetSummary.exceededBudgets}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Over Budget
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(budgetSummary.averageAdherence)}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Avg. Adherence
          </p>
        </div>
      </div>

      {/* Top Budget Progress */}
      <div className="space-y-4">
        {prioritizedBudgets.map((progress) => (
          <div
            key={progress.budget.id}
            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {progress.budget.name}
                </h4>
                {progress.isOverBudget && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${getStatusColor(progress)}`}
              >
                {Math.round(progress.percentage)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(
                  progress
                )}`}
                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{formatCurrency(progress.spent)} spent</span>
              <span>{formatCurrency(progress.budget.amount)} budget</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total Spending vs Budget */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Spent
            </p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(budgetSummary.totalSpent)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Budget
            </p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(budgetSummary.totalBudgetAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

