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
import ChartErrorBoundary from "@/components/charts/ChartErrorBoundary";
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
  Activity,
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
  getEarliestTransactionDateRange,
  toDateString,
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
import PageHeader from "@/components/ui/page-header";
import { TransactionSkeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/useDebounce";
import Image from "next/image";
import SpendingBarChart from "@/components/charts/SpendingBarChart";

// Chart error boundary is now imported from components

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
      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center text-2xl shadow-sm">
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

export default function TransactionsPage() {
  // Core data state
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<PlaidTransaction[]>(
    []
  );
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
  const [earliestTransactionDate, setEarliestTransactionDate] = useState<
    string | null
  >(null);

  // Unified filter state
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    return {
      limit: 50,
      offset: 0,
      sortBy: "date",
      sortOrder: "desc",
      ...getCurrentYearRange(),
      endDate: toDateString(today),
    };
  });

  // Pending filter state for changes that haven't been applied yet
  const [pendingFilters, setPendingFilters] = useState<TransactionFilters>(
    () => {
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );

      return {
        limit: 50,
        offset: 0,
        sortBy: "date",
        sortOrder: "desc",
        ...getCurrentYearRange(),
        endDate: toDateString(today),
      };
    }
  );

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

  // Memoized chart data with error handling
  const chartData = useMemo(() => {
    try {
      const processedData = {
        creditCardMetrics: calculateCreditCardMetrics(allTransactions),
        categoryData: processCategoryData(allTransactions),
        timeSeriesData: processTimeSeriesData(
          allTransactions,
          filters.startDate || getCurrentYearRange().startDate,
          filters.endDate || getCurrentYearRange().endDate
        ),
      };

      // Debug logging
      // console.log("Chart data processed:", {
      //   allTransactionsCount: allTransactions.length,
      //   paginatedTransactionsCount: transactions.length,
      //   categoryDataCount: processedData.categoryData.length,
      //   timeSeriesDataCount: processedData.timeSeriesData.length,
      //   creditCardMetrics: processedData.creditCardMetrics,
      // });

      return processedData;
    } catch (error) {
      console.error("Error processing chart data:", error);
      return {
        creditCardMetrics: {
          totalSpending: 0,
          averageTransaction: 0,
          largestTransaction: 0,
          transactionCount: 0,
        },
        categoryData: [],
        timeSeriesData: [],
      };
    }
  }, [allTransactions, filters.startDate, filters.endDate]);

  // Enhanced data validation helper
  const validateChartData = (data: any) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return false;
    }

    try {
      // Check if it's category data
      if (data[0] && "category" in data[0]) {
        return data.every(
          (item) =>
            item &&
            typeof item.category === "string" &&
            typeof item.amount === "number" &&
            !isNaN(item.amount) &&
            item.amount > 0
        );
      }

      // Check if it's time series data
      if (data[0] && "date" in data[0]) {
        return data.every(
          (item) =>
            item &&
            typeof item.date === "string" &&
            typeof item.amount === "number" &&
            !isNaN(item.amount) &&
            item.amount >= 0
        );
      }

      return false;
    } catch (error) {
      console.error("Error validating chart data:", error);
      return false;
    }
  };

  // Memoized category options
  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set<string>();
    availableCategories.forEach((cat) => uniqueCategories.add(cat.category));
    chartData.categoryData.forEach((cat) => uniqueCategories.add(cat.category));
    return Array.from(uniqueCategories).sort();
  }, [availableCategories, chartData.categoryData]);

  // Update pending filters when search term changes
  useEffect(() => {
    setPendingFilters((prev) => ({
      ...prev,
      search: debouncedSearchTerm.trim() || undefined,
      offset: 0,
    }));
  }, [debouncedSearchTerm]);

  // Load data when filters change
  useEffect(() => {
    loadData();
  }, [filters]);

  // Initialize earliest transaction date on component mount
  useEffect(() => {
    const initializeEarliestDate = async () => {
      const earliestDate = await getEarliestTransactionDate();

      // Update filters with the earliest date if we got one and it's different
      setFilters((prev) => {
        if (prev.startDate !== earliestDate) {
          const updatedFilters = {
            ...prev,
            startDate: earliestDate,
            offset: 0, // Reset pagination when changing date range
          };
          // Also update pending filters to keep them in sync
          setPendingFilters(updatedFilters);
          return updatedFilters;
        }
        return prev;
      });
    };

    initializeEarliestDate();
  }, []); // Only run once on mount

  // Get earliest transaction date
  const getEarliestTransactionDate = useCallback(async () => {
    try {
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );

      // Create minimal filters to find the earliest transaction
      const earlyFilters: TransactionFilters = {
        startDate: "2020-01-01", // Start from a very early date
        endDate: toDateString(today),
        limit: 1,
        offset: 0,
        sortBy: "date" as const,
        sortOrder: "asc" as const, // Ascending to get the earliest
      };

      const dashboardData = await plaidApi.getDashboardData(earlyFilters);

      if (dashboardData.transactions && dashboardData.transactions.length > 0) {
        const earliestDate = dashboardData.transactions[0].date;
        setEarliestTransactionDate(earliestDate);
        return earliestDate;
      }

      // Fallback to current year start if no transactions found
      return getCurrentYearRange().startDate;
    } catch (error) {
      console.error("Error getting earliest transaction date:", error);
      // Fallback to current year start on error
      return getCurrentYearRange().startDate;
    }
  }, []);

  // Load all transactions for analytics (no pagination)
  const loadAllTransactions = useCallback(async () => {
    try {
      // Create filters for all transactions (no limit/offset)
      const allTransactionsFilters: TransactionFilters = {
        ...filters,
        limit: undefined, // Remove limit to get all transactions
        offset: undefined, // Remove offset
      };

      const allData = await plaidApi.getDashboardData(allTransactionsFilters);
      setAllTransactions(allData.transactions);
    } catch (error) {
      console.error("Error loading all transactions for analytics:", error);
      // Fallback to using paginated transactions if all transactions fail
      setAllTransactions(transactions);
    }
  }, [filters, transactions]);

  // Optimized data loading for transactions list (paginated)
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setChartLoading(true);

      // Load paginated transactions for the list
      const dashboardData = await plaidApi.getDashboardData(filters);

      setTransactions(dashboardData.transactions);
      setTransactionStats(dashboardData.stats);
      setAvailableCategories(dashboardData.categories);
      setAccounts(dashboardData.accounts);
      setPagination(dashboardData.pagination);

      // Also load all transactions for charts
      await loadAllTransactions();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [filters, loadAllTransactions]);

  // Optimized sync function
  const handleSyncTransactions = useCallback(async () => {
    try {
      setError(null);
      setSyncing(true);
      setChartLoading(true);
      await plaidApi.syncTransactions();
      await loadData();
    } catch (error) {
      console.error("Error syncing transactions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sync transactions"
      );
    } finally {
      setSyncing(false);
      setChartLoading(false);
    }
  }, [loadData]);

  // Filter change handler - now updates pending filters
  const handleFilterChange = useCallback(
    (key: keyof TransactionFilters, value: string | number) => {
      setPendingFilters((prev) => ({
        ...prev,
        [key]: value,
        offset: 0,
      }));
    },
    []
  );

  const handleDateChange = useCallback(
    (key: keyof TransactionFilters, value: string) => {
      setPendingFilters((prev) => ({
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
      setPendingFilters((prev) => ({
        ...prev,
        startDate: range.startDate,
        endDate: range.endDate,
        offset: 0,
      }));
    },
    []
  );

  // Clear all filters and reset to earliest transaction date
  const clearFilters = useCallback(() => {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const resetFilters: TransactionFilters = {
      limit: 50,
      offset: 0,
      sortBy: "date" as const,
      sortOrder: "desc" as const,
      startDate: earliestTransactionDate || getCurrentYearRange().startDate,
      endDate: toDateString(today),
    };

    setFilters(resetFilters);
    setPendingFilters(resetFilters);
    setSearchTerm("");
  }, [earliestTransactionDate]);

  // Apply pending filters
  const applyFilters = useCallback(() => {
    setFilters(pendingFilters);
  }, [pendingFilters]);

  // Use transactions directly from backend
  const filteredTransactions = transactions;

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PageHeader
            title="Transactions"
            description="Manage and analyze your spending"
          />
          <div className="container mx-auto px-6 py-8">
            <TransactionSkeleton />
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader
          title="Transactions"
          description="Manage and analyze your spending"
          actions={
            <>
              <Button
                onClick={handleSyncTransactions}
                disabled={syncing}
                size="lg"
                className="gap-2"
              >
                <RefreshCw
                  className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
            </>
          }
        />

        <div className="container mx-auto px-6 py-8">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Total Transactions
                  </CardTitle>
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {transactionStats.totalCount}
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Transactions
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                    Total Spent
                  </CardTitle>
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(transactionStats.totalSpending)}
                </div>
                <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                  Total Spent
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Average Amount
                  </CardTitle>
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(transactionStats.averageAmount)}
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                  Average
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                    Largest Amount
                  </CardTitle>
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Activity className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(transactionStats.largestAmount)}
                </div>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  Largest
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Search and Filters - Shared between tabs */}
          <Card className="p-6 border-0 shadow-apple-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filters
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Filter data to analyze specific time periods and categories
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Hide" : "Show"} Advanced
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions, merchants, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 rounded-xl"
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

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    value={pendingFilters.startDate?.split("T")[0] || ""}
                    onChange={(e) =>
                      handleDateChange("startDate", e.target.value)
                    }
                    className="rounded-xl"
                  />
                  <Input
                    type="date"
                    placeholder="End Date"
                    value={pendingFilters.endDate?.split("T")[0] || ""}
                    onChange={(e) =>
                      handleDateChange("endDate", e.target.value)
                    }
                    className="rounded-xl"
                  />
                  <Select
                    value={pendingFilters.category || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "category",
                        value === "all" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl">
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
                    value={pendingFilters.status || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Apply Filters Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={applyFilters}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Filter className="h-4 w-4" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {(filters.startDate ||
              filters.endDate ||
              filters.category ||
              filters.status ||
              filters.search) && (
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Filters:
                </span>
                {filters.search && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Search: {filters.search}
                  </Badge>
                )}
                {filters.startDate && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    From: {formatDate(filters.startDate)}
                  </Badge>
                )}
                {filters.endDate && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    To: {formatDate(filters.endDate)}
                  </Badge>
                )}
                {filters.category && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Category: {filters.category}
                  </Badge>
                )}
                {filters.status && filters.status !== "all" && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Status: {filters.status}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-6 px-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Clear All
                </Button>
              </div>
            )}
          </Card>

          {/* Tabbed Interface */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full h-full grid-cols-2 mb-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
              <TabsTrigger
                value="transactions"
                className="flex w-full h-full items-center rounded-xl justify-center gap-2 font-medium transition-all duration-200 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-50 data-[state=active]:to-blue-100 dark:data-[state=active]:from-blue-900/30 dark:data-[state=active]:to-blue-800/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex w-full h-full items-center rounded-xl justify-center gap-2 font-medium transition-all duration-200 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-green-100 dark:data-[state=active]:from-green-900/30 dark:data-[state=active]:to-green-800/30 data-[state=active]:text-green-700 dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              {/* Transactions List */}
              <Card className="border-0 shadow-apple-lg">
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
                        <SelectTrigger className="w-32 rounded-lg">
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
                    <EmptyState
                      icon={CreditCard}
                      title="No transactions found"
                      description={
                        searchTerm || filters.category || filters.startDate
                          ? "Try adjusting your search or filters to find what you're looking for."
                          : "Sync your accounts to get started with transaction tracking."
                      }
                      action={{
                        label: "Sync Transactions",
                        onClick: handleSyncTransactions,
                      }}
                      secondaryAction={{
                        label: "Clear Filters",
                        onClick: clearFilters,
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      {filteredTransactions.map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-apple-lg transition-all duration-200 hover:border-primary-200 animate-slide-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
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
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                  <span>{formatDate(transaction.date)}</span>
                                  <span>•</span>
                                  <span>{transaction.account?.name}</span>
                                </div>

                                {transaction.merchantName && (
                                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    {transaction.merchantName}
                                  </p>
                                )}

                                <div className="flex gap-2 mt-3">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                  >
                                    {transaction.category}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div
                                className={`text-xl font-bold ${
                                  transaction.amount > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-green-600 dark:text-green-400"
                                }`}
                              >
                                {transaction.amount > 0 ? "-" : "+"}
                                {formatCurrency(Math.abs(transaction.amount))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Enhanced Pagination */}
                  {pagination.total > (filters.limit || 50) && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {(currentPage - 1) * (filters.limit || 50) + 1}{" "}
                        to{" "}
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
                          className="rounded-lg gap-2"
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
                          className="rounded-lg gap-2"
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
              {/* Debug Info - Remove in production */}
              {process.env.NODE_ENV === "development" && (
                <Card className="p-4 border-0 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Debug Info:</strong> All Transactions:{" "}
                    {allTransactions.length}, Paginated Transactions:{" "}
                    {transactions.length}, Categories:{" "}
                    {chartData.categoryData.length}, Time Series:{" "}
                    {chartData.timeSeriesData.length}
                  </div>
                </Card>
              )}
              <ChartErrorBoundary
                fallback={
                  <Card className="p-6 border-0 shadow-apple-lg">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">
                        Analytics failed to load
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        There was an issue loading the analytics section
                      </p>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                      >
                        Refresh Page
                      </Button>
                    </div>
                  </Card>
                }
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 border-0 shadow-apple-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Spending Trends
                      </h3>
                      <Select defaultValue="30d">
                        <SelectTrigger className="w-24 rounded-lg">
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
                      {chartLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                      ) : validateChartData(chartData.timeSeriesData) &&
                        chartData.timeSeriesData.length > 0 ? (
                        <ChartErrorBoundary
                          fallback={
                            <div className="h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                  <AlertTriangle className="h-8 w-8 text-red-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                  Chart failed to render
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Try refreshing the page
                                </p>
                              </div>
                            </div>
                          }
                        >
                          <SpendingBarChart
                            data={chartData.timeSeriesData}
                            title=""
                          />
                        </ChartErrorBoundary>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              No trend data available
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Sync transactions to see spending trends
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6 border-0 shadow-apple-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Top Categories
                      </h3>
                      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <Button
                          variant={chartView === "pie" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setChartView("pie")}
                          className="rounded-lg"
                        >
                          <PieChart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={chartView === "bar" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setChartView("bar")}
                          className="rounded-lg"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="h-64">
                      {chartLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                      ) : validateChartData(chartData.categoryData) &&
                        chartData.categoryData.length > 0 ? (
                        <ChartErrorBoundary
                          fallback={
                            <div className="h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                  <AlertTriangle className="h-8 w-8 text-red-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                  Chart failed to render
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Try refreshing the page
                                </p>
                              </div>
                            </div>
                          }
                        >
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
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <BarChart3 className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              No category data available
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Sync transactions to see category breakdown
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </ChartErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthWrapper>
  );
}
