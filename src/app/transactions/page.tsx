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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Download,
  MoreHorizontal,
  X,
  Eye,
  EyeOff,
  Settings,
  Info,
  Sparkles,
  Target,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
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

// Enhanced skeleton loading component
const TransactionSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

// Enhanced error boundary component for charts
const ChartErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <p className="text-gray-600 mb-2 font-medium">
          Failed to load chart data
        </p>
        <p className="text-sm text-gray-500 mb-4">
          There was an issue loading the visualization
        </p>
        <Button onClick={() => setHasError(false)} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return <div onError={() => setHasError(true)}>{children}</div>;
};

// Enhanced transaction icon component
const TransactionIcon = ({
  transaction,
}: {
  transaction: PlaidTransaction;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!transaction.categoryIcon || imageError) {
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
      return "💳";
    };

    return (
      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center text-2xl shadow-sm">
        {getCategoryIcon(transaction.category)}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center shadow-sm">
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
      {transaction.pending && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-sm"></div>
      )}
    </div>
  );
};

// Custom debounce hook
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
  const [activeTab, setActiveTab] = useState("transactions");
  const [chartView, setChartView] = useState<"pie" | "bar" | "line">("pie");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // Unified filter state
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

  // Memoized chart data
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

  // Memoized category options
  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set<string>();
    availableCategories.forEach((cat) => uniqueCategories.add(cat.category));
    chartData.categoryData.forEach((cat) => uniqueCategories.add(cat.category));
    return Array.from(uniqueCategories).sort();
  }, [availableCategories, chartData.categoryData]);

  // Update filters when search term changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearchTerm.trim() || undefined,
      offset: 0,
    }));
  }, [debouncedSearchTerm]);

  // Load data when filters change
  useEffect(() => {
    loadData();
  }, [filters]);

  // Optimized data loading
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const dashboardData = await plaidApi.getDashboardData(filters);

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

  // Filter change handler
  const handleFilterChange = useCallback(
    (key: keyof TransactionFilters, value: string | number) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        offset: 0,
      }));
    },
    []
  );

  // Pagination handler
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

  // Use transactions directly from backend
  const filteredTransactions = transactions;

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
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Mobile Header */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Transactions
            </h1>
            <Button
              size="sm"
              onClick={handleSyncTransactions}
              disabled={syncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Mobile stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {transactionStats.totalCount}
              </div>
              <div className="text-xs text-blue-600">Transactions</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(transactionStats.totalSpending)}
              </div>
              <div className="text-xs text-green-600">Spent</div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:block mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Transactions
              </h1>
              <p className="text-gray-600 mt-2">
                Manage and analyze your spending
              </p>
              {error && (
                <div className="flex items-center gap-2 text-red-600 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleSyncTransactions} disabled={syncing}>
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
            </div>
          </div>

          {/* Desktop stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {transactionStats.totalCount}
              </div>
              <div className="text-sm text-blue-600">Transactions</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(transactionStats.totalSpending)}
              </div>
              <div className="text-sm text-green-600">Total Spent</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(transactionStats.averageAmount)}
              </div>
              <div className="text-sm text-purple-600">Average</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(transactionStats.largestAmount)}
              </div>
              <div className="text-sm text-orange-600">Largest</div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions, merchants, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Quick Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => handleQuickDateFilter(getLast30DaysRange())}
                  >
                    Last 30 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleQuickDateFilter(getCurrentMonthRange())
                    }
                  >
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleQuickDateFilter(getCurrentYearRange())}
                  >
                    This Year
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Filters */}
            {showFilters && (
              <Card className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    value={filters.startDate || ""}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                  />
                  <Input
                    type="date"
                    placeholder="End Date"
                    value={filters.endDate || ""}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                  />
                  <Select
                    value={filters.category || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "category",
                        value === "all" ? "" : value
                      )
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
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
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
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              </Card>
            )}

            {/* Transactions List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">
                      Transaction History
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      {filteredTransactions.length} of {pagination.total}{" "}
                      transactions
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(filters.limit)}
                      onValueChange={(value) =>
                        handleFilterChange("limit", parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TransactionSkeleton />
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No transactions found
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {searchTerm || filters.category || filters.startDate
                        ? "Try adjusting your search or filters to find what you're looking for."
                        : "Sync your accounts to get started with transaction tracking."}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                      <Button onClick={handleSyncTransactions}>
                        Sync Transactions
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTransactions.map((transaction, index) => (
                      <div
                        key={transaction.id}
                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-primary-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <TransactionIcon transaction={transaction} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {transaction.name}
                                </h3>
                                {transaction.pending && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>{formatDate(transaction.date)}</span>
                                <span>•</span>
                                <span>{transaction.account?.name}</span>
                              </div>

                              {transaction.merchantName && (
                                <p className="text-sm text-gray-400 mt-1">
                                  {transaction.merchantName}
                                </p>
                              )}

                              <div className="flex gap-2 mt-3">
                                <Badge variant="secondary" className="text-xs">
                                  {transaction.category}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-xl font-bold ${
                                transaction.amount < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {transaction.amount < 0 ? "-" : "+"}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                          </div>
                        </div>

                        {/* Hover actions */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Category
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enhanced Pagination */}
                {pagination.total > (filters.limit || 50) && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <div className="text-sm text-gray-500">
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
                      <span className="text-sm text-gray-600 px-3">
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
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Spending Trends</h3>
                  <Select defaultValue="30d">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-64">
                  {validateChartData(chartData.timeSeriesData) ? (
                    <ChartErrorBoundary>
                      <SpendingLineChart
                        data={chartData.timeSeriesData}
                        title=""
                      />
                    </ChartErrorBoundary>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No trend data available
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Top Categories</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={chartView === "pie" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartView("pie")}
                    >
                      <PieChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartView === "bar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartView("bar")}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="h-64">
                  {validateChartData(chartData.categoryData) ? (
                    <ChartErrorBoundary>
                      {chartView === "pie" ? (
                        <CategoryPieChart
                          data={chartData.categoryData}
                          title=""
                        />
                      ) : (
                        <CategoryBarChart
                          data={chartData.categoryData}
                          title=""
                        />
                      )}
                    </ChartErrorBoundary>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No category data available
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUpIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Spending Trend</h3>
                    <p className="text-sm text-gray-500">
                      This month vs last month
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">+12.5%</div>
                <p className="text-sm text-gray-500 mt-1">
                  Your spending increased by 12.5%
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Budget Status</h3>
                    <p className="text-sm text-gray-500">
                      Monthly budget progress
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">75%</div>
                <p className="text-sm text-gray-500 mt-1">
                  You've used 75% of your budget
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Smart Insights</h3>
                    <p className="text-sm text-gray-500">
                      AI-powered recommendations
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Consider reducing dining out expenses - you're 20% above your
                  usual spending in this category.
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AuthWrapper>
  );
}
