"use client";

import { useState, useMemo } from "react";
import { BudgetProgress } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  Target,
  Clock,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface BudgetProgressCardProps {
  progress: BudgetProgress;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function BudgetProgressCard({
  progress,
  onEdit,
  onDelete,
  className = "",
}: BudgetProgressCardProps) {
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const isDark = useTheme();
  const {
    budget,
    spent,
    remaining,
    percentage,
    daysRemaining,
    isOverBudget,
    projectedSpend,
    transactions,
  } = progress;

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.amount - a.amount),
    [transactions]
  );

  // Determine status color and icon
  const getStatusInfo = () => {
    if (isOverBudget) {
      return {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        icon: <AlertTriangle className="w-4 h-4" />,
        status: "Over Budget",
      };
    } else if (percentage >= budget.alertThreshold) {
      return {
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        icon: <AlertTriangle className="w-4 h-4" />,
        status: "Warning",
      };
    } else {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        icon: <Target className="w-4 h-4" />,
        status: "On Track",
      };
    }
  };

  const statusInfo = getStatusInfo();

  // Progress bar color
  const getProgressBarColor = () => {
    if (isOverBudget) return "bg-red-500";
    if (percentage >= budget.alertThreshold) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Format period display
  const formatPeriod = () => {
    switch (budget.period) {
      case "WEEKLY":
        return "Weekly";
      case "MONTHLY":
        return "Monthly";
      case "YEARLY":
        return "Yearly";
      case "CUSTOM":
        return "Custom";
      default:
        return budget.period;
    }
  };

  // Format budget type display
  const formatBudgetType = () => {
    switch (budget.budgetType) {
      case "CATEGORY":
        return `Category: ${budget.targetValue}`;
      case "MERCHANT":
        return `Merchant: ${budget.merchantName}`;
      case "ACCOUNT":
        return `Account: ${budget.account?.name || "Unknown"}`;
      case "TOTAL":
        return "Total Spending";
      default:
        return budget.budgetType;
    }
  };

  return (
    <div
      className={`${className} ${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-xl p-6 transition-all duration-200 hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {statusInfo.icon}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {budget.name}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatBudgetType()} • {formatPeriod()}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Edit budget"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Delete budget"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor} mb-4`}
      >
        {statusInfo.icon}
        {statusInfo.status}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Spent</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(spent)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Remaining
            </p>
            <p
              className={`font-semibold ${
                isOverBudget
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {isOverBudget
                ? `-${formatCurrency(Math.abs(remaining))}`
                : formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Additional insights */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{daysRemaining} days left</span>
        </div>

        {projectedSpend > budget.amount && (
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">
              Projected: {formatCurrency(projectedSpend)}
            </span>
          </div>
        )}
      </div>

      {/* Budget amount */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Budget Total
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(budget.amount)}
          </span>
        </div>
      </div>

      {/* Transactions accordion: section scoped by budget.id, content always in DOM to avoid wrong placement */}
      <section
        id={`transactions-section-${budget.id}`}
        role="region"
        aria-labelledby={`transactions-trigger-${budget.id}`}
        className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600"
      >
        <button
          id={`transactions-trigger-${budget.id}`}
          type="button"
          onClick={() => setTransactionsExpanded((prev) => !prev)}
          aria-expanded={transactionsExpanded}
          aria-controls={`transactions-list-${budget.id}`}
          className="flex w-full items-center justify-between text-left text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <span>Transactions ({transactions.length})</span>
          {transactionsExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </button>
        <div
          id={`transactions-list-${budget.id}`}
          role="region"
          aria-hidden={!transactionsExpanded}
          className={`mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden transition-[max-height] duration-200 ${
            transactionsExpanded ? "max-h-[2000px]" : "max-h-0 mt-0"
          }`}
        >
          {transactions.length === 0 ? (
            <p className="col-span-full text-sm text-gray-500 dark:text-gray-400 py-2">
              No transactions in this period.
            </p>
          ) : (
            sortedTransactions.map((transaction) => {
              const transactionPercent =
                budget.amount === 0
                  ? 0
                  : (transaction.amount / budget.amount) * 100;
              const barWidth = Math.min(transactionPercent, 100);
              return (
                <div
                  key={transaction.plaidTransactionId}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">
                      {transaction.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gray-500 dark:bg-gray-400 transition-all duration-300 min-w-0"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {transactionPercent.toFixed(1)}% of budget
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
