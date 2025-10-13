"use client";

import { useState, useEffect } from "react";
import {
  Budget,
  BudgetProgress,
  BudgetSummary,
  CreateBudgetRequest,
  PlaidAccount,
} from "@/types";
import { budgetApi, plaidApi } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/lib/utils";
import BudgetProgressCard from "./BudgetProgressCard";
import BudgetCreationModal from "./BudgetCreationModal";
import BudgetAlertPanel from "./BudgetAlertPanel";
import {
  Plus,
  Filter,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface BudgetDashboardProps {
  className?: string;
}

export default function BudgetDashboard({
  className = "",
}: BudgetDashboardProps) {
  const isDark = useTheme();

  // State
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(
    null
  );
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<
    "all" | "active" | "exceeded" | "warning"
  >("all");

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [progressData, summaryData, accountsData, categoriesData] =
        await Promise.all([
          budgetApi.getAllBudgetProgress(),
          budgetApi.getBudgetSummary(),
          plaidApi.getAccounts(),
          plaidApi.getCategories(),
        ]);

      setBudgetProgress(progressData);
      setBudgetSummary(summaryData);
      setAccounts(accountsData);
      setCategories(categoriesData.map((c) => c.category));
    } catch (error) {
      console.error("Error loading budget dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleCreateBudget = async (budgetData: CreateBudgetRequest) => {
    try {
      setModalLoading(true);
      await budgetApi.createBudget(budgetData);
      await loadDashboardData();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating budget:", error);
      throw error;
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateBudget = async (
    budgetId: string,
    updates: Partial<CreateBudgetRequest>
  ) => {
    try {
      setModalLoading(true);
      await budgetApi.updateBudget(budgetId, updates);
      await loadDashboardData();
      setEditingBudget(null);
    } catch (error) {
      console.error("Error updating budget:", error);
      throw error;
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    try {
      await budgetApi.deleteBudget(budgetId);
      await loadDashboardData();
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  };

  // Filter budgets based on current filter
  const filteredBudgets = budgetProgress.filter((progress) => {
    switch (filter) {
      case "active":
        return progress.budget.isActive;
      case "exceeded":
        return progress.isOverBudget;
      case "warning":
        return (
          progress.percentage >= progress.budget.alertThreshold &&
          !progress.isOverBudget
        );
      default:
        return true;
    }
  });

  const getFilterCount = (filterType: typeof filter) => {
    switch (filterType) {
      case "active":
        return budgetProgress.filter((p) => p.budget.isActive).length;
      case "exceeded":
        return budgetProgress.filter((p) => p.isOverBudget).length;
      case "warning":
        return budgetProgress.filter(
          (p) => p.percentage >= p.budget.alertThreshold && !p.isOverBudget
        ).length;
      default:
        return budgetProgress.length;
    }
  };

  if (loading) {
    return (
      <div className={`${className} bg-white dark:bg-gray-800 rounded-xl p-6`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Budget Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage your spending budgets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Budget
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {budgetSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Budgets
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {budgetSummary.totalBudgets}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Budgets
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {budgetSummary.activeBudgets}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Over Budget
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {budgetSummary.exceededBudgets}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Avg. Adherence
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(budgetSummary.averageAdherence)}%
                </p>
              </div>
              <PieChart className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: "all" as const, label: "All Budgets", icon: Target },
          { key: "active" as const, label: "Active", icon: TrendingUp },
          {
            key: "exceeded" as const,
            label: "Over Budget",
            icon: AlertTriangle,
          },
          { key: "warning" as const, label: "Warning", icon: Calendar },
        ].map(({ key, label, icon: Icon }) => {
          const count = getFilterCount(key);
          const isActive = filter === key;

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Budget Alerts Panel */}
      <BudgetAlertPanel />

      {/* Budget Progress Cards */}
      {filteredBudgets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBudgets.map((progress) => (
            <BudgetProgressCard
              key={progress.budget.id}
              progress={progress}
              onEdit={() => setEditingBudget(progress.budget)}
              onDelete={() => handleDeleteBudget(progress.budget.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {filter === "all" ? "No budgets yet" : `No ${filter} budgets`}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filter === "all"
              ? "Create your first budget to start tracking your spending"
              : `You don't have any ${filter} budgets right now`}
          </p>
          {filter === "all" && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Budget
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <BudgetCreationModal
        isOpen={isCreateModalOpen || !!editingBudget}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBudget(null);
        }}
        onSave={handleCreateBudget}
        onUpdate={handleUpdateBudget}
        budget={editingBudget}
        accounts={accounts}
        categories={categories}
        loading={modalLoading}
      />
    </div>
  );
}
