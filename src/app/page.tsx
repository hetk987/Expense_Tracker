"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import SpendingBarChart from "@/components/charts/SpendingBarChart";
import {
  CreditCard,
  TrendingDown,
  Plus,
  RefreshCw,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { plaidApi } from "@/lib/api";
import { PlaidAccount, PlaidTransaction } from "@/types";
import {
  formatCurrency,
  formatDate,
  getCurrentMonthRange,
  getCurrentYearRange,
} from "@/lib/utils";
import {
  processCategoryData,
  processTimeSeriesData,
  calculateCreditCardMetrics,
  getTopSpendingCategories,
  getAllCategoriesWithCounts,
} from "@/lib/chartUtils";
import CategoryBarChart from "@/components/charts/CategoryBarChart";
import AuthWrapper from "@/components/AuthWrapper";
import PageHeader from "@/components/ui/page-header";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import BudgetOverview from "@/components/budget/BudgetOverview";
import Image from "next/image";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [allTransactions, setAllTransactions] = useState<PlaidTransaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [chartView, setChartView] = useState<"pie" | "bar" | "line">("pie");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Use optimized single API call instead of multiple separate calls
      const dashboardData = await plaidApi.getDashboardData({
        limit: 1000,
        ...getCurrentYearRange(),
      });

      setAccounts(dashboardData.accounts);
      setAllTransactions(dashboardData.transactions);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTransactions = async () => {
    try {
      setSyncing(true);
      await plaidApi.syncTransactions();
      await loadDashboardData(); // Reload data after sync
    } catch (error) {
      console.error("Error syncing transactions:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Get categories from ALL transactions, not filtered ones
  const allCategories = [
    "all",
    ...Array.from(
      new Set(
        allTransactions
          .filter((t) => t.amount > 0)
          .flatMap((t) => t.category || [])
          .filter(Boolean)
      )
    ),
  ];

  const filteredTransactions =
    selectedCategory === "all"
      ? allTransactions.filter((t) => t.amount > 0)
      : allTransactions.filter(
          (t) =>
            t.category && t.category.includes(selectedCategory) && t.amount > 0
        );

  const timeSeriesData = processTimeSeriesData(
    filteredTransactions,
    getCurrentYearRange().startDate,
    getCurrentYearRange().endDate
  );

  const topCategories = showAllCategories
    ? getAllCategoriesWithCounts(allTransactions)
    : getTopSpendingCategories(allTransactions);

  const totalSpending = filteredTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const averageTransaction =
    filteredTransactions.length > 0
      ? totalSpending / filteredTransactions.length
      : 0;

  const largestTransaction =
    filteredTransactions.length > 0
      ? Math.max(
          ...filteredTransactions
            .filter((t) => t.amount > 0)
            .map((t) => Math.abs(t.amount))
        )
      : 0;

  if (loading) {
    return (
      <AuthWrapper>
        <div className="container mx-auto px-6 py-8">
          <DashboardSkeleton />
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Enhanced Header */}
        <PageHeader
          title="Financial Dashboard"
          description="Track your spending, monitor trends, and stay on top of your finances"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncTransactions}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
              <Button size="sm" asChild className="flex items-center">
                <Link href="/link-account" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Account
                </Link>
              </Button>
            </>
          }
        />

        <div className="container mx-auto px-6 py-8 ">
          {/* Smart Category Filter */}
          {allCategories.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Filter by Category
                </h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className={`${
                      showAllCategories
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                        : ""
                    }`}
                  >
                    {showAllCategories
                      ? "Show Expenses Only"
                      : "Show All Categories"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className={
                      selectedCategory === "all"
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                        : ""
                    }
                  >
                    View All
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                {allCategories.map((category) => {
                  // Calculate dynamic width based on category name length and total categories
                  const categoryText =
                    category === "all" ? "All Categories" : String(category);
                  const textLength = categoryText.length;
                  const baseWidth = Math.max(textLength * 9 + 24, 80); // 9px per char + 24px for padding
                  const maxWidth = Math.min(200, baseWidth); // Cap at 200px
                  const minWidth = allCategories.length > 8 ? 70 : 90; // Smaller min width if many categories
                  const calculatedWidth = Math.max(
                    minWidth,
                    Math.min(maxWidth, textLength * 9 + 24)
                  );

                  return (
                    <Button
                      key={String(category)}
                      variant={
                        selectedCategory === category ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedCategory(String(category))}
                      className={`rounded-full px-3 py-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                        selectedCategory === category
                          ? "bg-primary-600 text-white shadow-lg"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                      style={{
                        width: `${calculatedWidth}px`,
                        minWidth: `${minWidth}px`,
                        maxWidth: `${maxWidth}px`,
                      }}
                    >
                      {categoryText}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Total Spending
                  </CardTitle>
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(totalSpending)}
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Across {filteredTransactions.length} transactions
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                    Average Transaction
                  </CardTitle>
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(averageTransaction)}
                </div>
                <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                  Per transaction
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Largest Transaction
                  </CardTitle>
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(largestTransaction)}
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                  Highest single charge
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Linked Cards
                  </CardTitle>
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {accounts.length}
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                  Connected accounts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Category Spending Chart */}
            <Card className="border-0 shadow-apple-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                      Spending by Category
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Visual breakdown of your expenses
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <Button
                      variant={chartView === "pie" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setChartView("pie")}
                      className="rounded-full"
                    >
                      <PieChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartView === "bar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setChartView("bar")}
                      className="rounded-full"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {chartView === "pie" ? (
                    <CategoryPieChart data={topCategories} title="" />
                  ) : (
                    <CategoryBarChart data={topCategories} title="" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Spending Over Time Chart */}
            <Card className="border-0 shadow-apple-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  Spending Over Time
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Track your spending trends and patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <SpendingBarChart data={timeSeriesData} title="" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Overview and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
              <BudgetOverview />
            </div>
            <div className="lg:col-span-2">
              {/* Additional analytics can go here in future */}
            </div>
          </div>

          {/* Accounts and Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Linked Accounts */}
            <Card className="border-0 shadow-apple-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <CreditCard className="h-5 w-5" />
                      Linked Credit Cards
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Your connected credit card accounts
                    </CardDescription>
                  </div>
                  {accounts.length > 0 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href="/accounts"
                        className="flex items-center gap-2"
                      >
                        Manage
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title="No credit cards linked"
                    description="Link your first credit card to start tracking expenses and get insights into your spending patterns."
                    action={{
                      label: "Link Your First Card",
                      href: "/link-account",
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {account.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {account.type} • {account.subtype}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border-0 shadow-apple-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Calendar className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Your latest credit card activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No transactions yet"
                    description="Sync your accounts to see your recent transactions and spending activity."
                    action={{
                      label: "Sync Transactions",
                      onClick: handleSyncTransactions,
                    }}
                    secondaryAction={{
                      label: "View All",
                      href: "/transactions",
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
                            <Image
                              src={transaction.categoryIcon || ""}
                              alt={transaction.name}
                              width={40}
                              height={40}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {transaction.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(transaction.date)}
                            </p>
                            {transaction.category &&
                              transaction.category.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {transaction.category}
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                          {transaction.pending && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="pt-4">
                      <Button
                        asChild
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Link
                          href="/transactions"
                          className="flex items-center gap-2"
                        >
                          View All Transactions
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
