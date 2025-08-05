"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import CategoryBarChart from "@/components/charts/CategoryBarChart";
import SpendingLineChart from "@/components/charts/SpendingLineChart";
import {
  CreditCard,
  Filter,
  Search,
  Calendar,
  DollarSign,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { plaidApi } from "@/lib/api";
import {
  PlaidTransaction,
  PlaidAccount,
  TransactionFilters,
  CategoryData,
  CategoryStats,
} from "@/types";
import {
  formatCurrency,
  formatDate,
  getCurrentMonthRange,
  getCurrentYearRange,
  getLast30DaysRange,
} from "@/lib/utils";
import {
  processCategoryData,
  processTimeSeriesData,
  calculateCreditCardMetrics,
  getAvailableCategories,
} from "@/lib/chartUtils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthWrapper from "@/components/AuthWrapper";
import Image from "next/image";

// Skeleton loading component
const TransactionSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between p-4 border rounded-lg"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-5 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

// Error boundary component for charts
const ChartErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">Failed to load chart data</p>
        <Button onClick={() => setHasError(false)} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return <div onError={() => setHasError(true)}>{children}</div>;
};

// Transaction icon component with error handling
const TransactionIcon = ({
  transaction,
}: {
  transaction: PlaidTransaction;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!transaction.categoryIcon || imageError) {
    // Fallback icon based on category
    const getCategoryIcon = (category: string) => {
      const categoryLower = category.toLowerCase();
      if (
        categoryLower.includes("food") ||
        categoryLower.includes("restaurant")
      )
        return "🍽️";
      if (
        categoryLower.includes("transport") ||
        categoryLower.includes("travel")
      )
        return "🚗";
      if (
        categoryLower.includes("shopping") ||
        categoryLower.includes("retail")
      )
        return "🛍️";
      if (categoryLower.includes("entertainment")) return "🎬";
      if (categoryLower.includes("health") || categoryLower.includes("medical"))
        return "🏥";
      if (categoryLower.includes("education")) return "📚";
      if (categoryLower.includes("loan") || categoryLower.includes("payment"))
        return "💳";
      return "💳"; // Default credit card icon
    };

    return (
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl">
        {getCategoryIcon(transaction.category)}
      </div>
    );
  }

  return (
    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center relative">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      )}
      <Image
        src={transaction.categoryIcon}
        width={48}
        height={48}
        alt={`${transaction.category} icon`}
        className={`rounded-full ${
          imageLoading ? "opacity-0" : "opacity-100"
        } transition-opacity`}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
      />
    </div>
  );
};

// Custom debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function TransactionsPage() {
  // Core data state
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    CategoryStats[]
  >([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showCharts, setShowCharts] = useState(false);
  const [chartView, setChartView] = useState<"pie" | "bar" | "line">("pie");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  // Unified filter state (simplified)
  const [filters, setFilters] = useState<TransactionFilters>({
    limit: 50,
    offset: 0,
    sortBy: "date",
    sortOrder: "desc",
    ...getCurrentYearRange(),
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  });

  // Transaction stats state
  const [transactionStats, setTransactionStats] = useState<{
    totalCount: number;
    totalSpending: number;
    averageAmount: number;
    largestAmount: number;
  }>({
    totalCount: 0,
    totalSpending: 0,
    averageAmount: 0,
    largestAmount: 0,
  });

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized computed values
  const currentPage = useMemo(
    () => Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
    [filters.offset, filters.limit]
  );

  const totalPages = useMemo(
    () => Math.ceil(pagination.total / (filters.limit || 50)),
    [pagination.total, filters.limit]
  );

  // Memoized chart data for performance
  const chartData = useMemo(
    () => ({
      creditCardMetrics: calculateCreditCardMetrics(transactions),
      categoryData: processCategoryData(transactions),
      timeSeriesData: processTimeSeriesData(
        transactions,
        filters.startDate || getCurrentYearRange().startDate,
        filters.endDate || getCurrentYearRange().endDate
      ),
    }),
    [transactions, filters.startDate, filters.endDate]
  );

  // Data validation helper
  const validateChartData = (data: any) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return false;
    }
    return data.every(
      (item) =>
        item &&
        typeof item.category === "string" &&
        typeof item.amount === "number"
    );
  };

  // Memoized category options for filters (consistent with chart data)
  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set<string>();

    // Add categories from backend
    availableCategories.forEach((cat) => uniqueCategories.add(cat.category));

    // Add categories from current transactions (for consistency)
    chartData.categoryData.forEach((cat) => uniqueCategories.add(cat.category));

    return Array.from(uniqueCategories).sort();
  }, [availableCategories, chartData.categoryData]);

  // Update filters when search term changes (debounced)
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearchTerm.trim() || undefined,
      offset: 0, // Reset pagination
    }));
  }, [debouncedSearchTerm]);

  // Load data when filters change
  useEffect(() => {
    loadData();
  }, [filters]);

  // Optimized data loading with error handling
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const dashboardData = await plaidApi.getDashboardData(filters);
      console.log(dashboardData.stats);

      setTransactions(dashboardData.transactions);
      setTransactionStats(dashboardData.stats);
      setAvailableCategories(dashboardData.categories);
      setAccounts(dashboardData.accounts);
      setPagination(dashboardData.pagination);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Optimized sync function
  const handleSyncTransactions = useCallback(async () => {
    try {
      setError(null);
      setSyncing(true);
      await plaidApi.syncTransactions();
      await loadData();
    } catch (error) {
      console.error("Error syncing transactions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sync transactions"
      );
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  // Optimized filter change handler
  const handleFilterChange = useCallback(
    (key: keyof TransactionFilters, value: string | number) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        offset: 0, // Reset pagination when filters change
      }));
    },
    []
  );

  // Optimized pagination handler
  const handlePageChange = useCallback((newOffset: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: newOffset,
    }));
  }, []);

  // Quick date filter handlers
  const handleQuickDateFilter = useCallback(
    (range: { startDate: string; endDate: string }) => {
      setFilters((prev) => ({
        ...prev,
        startDate: range.startDate,
        endDate: range.endDate,
        offset: 0,
      }));
    },
    []
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      limit: 50,
      offset: 0,
      sortBy: "date",
      sortOrder: "desc",
      ...getCurrentYearRange(),
    });
    setSearchTerm("");
  }, []);

  // Use transactions directly from backend (already filtered and sorted)
  const filteredTransactions = transactions;

  // Total spending is now calculated on the backend

  if (loading) {
    return (
      <AuthWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading transactions...
            </p>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Credit Card Transactions
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and analyze your credit card spending
            </p>
            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
            <Button
              onClick={() => setShowCharts(!showCharts)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {showCharts ? "Hide Analytics" : "Show Analytics"}
            </Button>
            <Button
              onClick={handleSyncTransactions}
              disabled={syncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync Transactions"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Transactions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-primary-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {transactionStats.totalCount}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredTransactions.length} of {pagination.total}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Spending
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(transactionStats.totalSpending)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Transaction
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(transactionStats.averageAmount)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Largest Transaction
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(transactionStats.largestAmount)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Single purchase
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Category Spending Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Spending by Category
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant={chartView === "pie" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartView("pie")}
                    className="flex items-center gap-1"
                  >
                    <PieChart className="h-4 w-4" />
                    Pie
                  </Button>
                  <Button
                    variant={chartView === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartView("bar")}
                    className="flex items-center gap-1"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Bar
                  </Button>
                </div>
              </div>
              {chartLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : validateChartData(chartData.categoryData) ? (
                <ChartErrorBoundary>
                  {chartView === "pie" ? (
                    <CategoryPieChart data={chartData.categoryData} title="" />
                  ) : (
                    <CategoryBarChart data={chartData.categoryData} title="" />
                  )}
                </ChartErrorBoundary>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No chart data available
                </div>
              )}
            </div>

            {/* Spending Over Time Chart */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Spending Over Time
              </h2>
              {chartLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : validateChartData(chartData.timeSeriesData) ? (
                <ChartErrorBoundary>
                  <SpendingLineChart data={chartData.timeSeriesData} title="" />
                </ChartErrorBoundary>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No time series data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Filters
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Search and filter your transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    aria-label="Search transactions by name or merchant"
                  />
                </div>

                {/* Start Date */}
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate || ""}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  aria-label="Filter transactions from this date"
                />

                {/* End Date */}
                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate || ""}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  aria-label="Filter transactions until this date"
                />

                {/* Category Filter */}
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("category", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split("-") as [
                      "date" | "amount" | "name",
                      "asc" | "desc"
                    ];
                    handleFilterChange("sortBy", newSortBy);
                    handleFilterChange("sortOrder", newSortOrder);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="amount-desc">
                      Amount (High to Low)
                    </SelectItem>
                    <SelectItem value="amount-asc">
                      Amount (Low to High)
                    </SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Limit Selection */}
                <Select
                  value={String(filters.limit)}
                  onValueChange={(value) => {
                    const newLimit = parseInt(value);
                    handleFilterChange("limit", newLimit);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                    <SelectItem value="250">250 per page</SelectItem>
                    <SelectItem value="500">500 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Date Filters */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const range = getCurrentYearRange();
                    handleQuickDateFilter(range);
                  }}
                >
                  This Year
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const range = getCurrentMonthRange();
                    handleQuickDateFilter(range);
                  }}
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const range = getLast30DaysRange();
                    handleQuickDateFilter(range);
                  }}
                >
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Dates
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Transaction History
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {filteredTransactions.length} of {pagination.total} transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TransactionSkeleton />
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  No transactions found
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your filters or sync your accounts to get the
                  latest transactions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    role="article"
                    aria-label={`Transaction ${index + 1}: ${
                      transaction.name
                    } for ${formatCurrency(Math.abs(transaction.amount))}`}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-4">
                      <TransactionIcon transaction={transaction} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.account && (
                            <>
                              <span>•</span>
                              <span>{transaction.account.name}</span>
                            </>
                          )}
                        </div>
                        {transaction.merchantName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.merchantName}
                          </p>
                        )}
                        {transaction.category && (
                          <div className="flex gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {transaction.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium text-lg ${
                          transaction.amount < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {transaction.amount < 0 ? "-" : "+"}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {transaction.pending && (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.total > (filters.limit || 50) && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * (filters.limit || 50) + 1} to{" "}
                  {Math.min(
                    currentPage * (filters.limit || 50),
                    pagination.total
                  )}{" "}
                  of {pagination.total} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(
                        Math.max(
                          0,
                          (filters.offset || 0) - (filters.limit || 50)
                        )
                      )
                    }
                    disabled={(filters.offset || 0) === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(
                        (filters.offset || 0) + (filters.limit || 50)
                      )
                    }
                    disabled={
                      (filters.offset || 0) + (filters.limit || 50) >=
                      pagination.total
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthWrapper>
  );
}
