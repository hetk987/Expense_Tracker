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
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import CategoryBarChart from "@/components/charts/CategoryBarChart";
import ChartErrorBoundary from "@/components/charts/ChartErrorBoundary";
import {
    ChartLoadingSpinner,
    ChartEmptyOrError,
    ChartErrorFallback,
} from "@/components/charts/ChartPlaceholder";
import {
    CreditCard,
    Filter,
    Search,
    DollarSign,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    PieChart,
    TrendingUp,
    X,
    Clock,
    AlertTriangle,
    Activity,
    Check,
} from "lucide-react";
import { getDashboardData } from "@/app/actions";
import { plaidApi } from "@/lib/api";
import {
    PlaidTransaction,
    PlaidAccount,
    TransactionFilters,
    CategoryStats,
} from "@/types";
import {
    formatCurrency,
    formatDate,
    getCurrentYearRange,
    getInitialFilters,
    getTodayDateString,
    toDateString,
} from "@/lib/utils";
import {
    processCategoryData,
    processTimeSeriesData,
    calculateCreditCardMetrics,
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

function getCategoryIcon(category: string): string {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("food") || categoryLower.includes("restaurant"))
        return "🍽️";
    if (categoryLower.includes("transport") || categoryLower.includes("travel"))
        return "🚗";
    if (categoryLower.includes("shopping") || categoryLower.includes("retail"))
        return "🛍️";
    if (categoryLower.includes("entertainment")) return "🎬";
    if (categoryLower.includes("health") || categoryLower.includes("medical"))
        return "🏥";
    if (categoryLower.includes("education")) return "📚";
    if (categoryLower.includes("loan") || categoryLower.includes("payment"))
        return "💳";
    return "💳";
}

const statCardVariants = {
    blue: {
        card: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
        title: "text-blue-700 dark:text-blue-300",
        value: "text-blue-900 dark:text-blue-100",
        subtitle: "text-blue-600 dark:text-blue-300",
        iconBg: "bg-blue-500/10",
        icon: "text-blue-600",
    },
    green: {
        card: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
        title: "text-green-700 dark:text-green-300",
        value: "text-green-900 dark:text-green-100",
        subtitle: "text-green-600 dark:text-green-300",
        iconBg: "bg-green-500/10",
        icon: "text-green-600",
    },
    purple: {
        card: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
        title: "text-purple-700 dark:text-purple-300",
        value: "text-purple-900 dark:text-purple-100",
        subtitle: "text-purple-600 dark:text-purple-300",
        iconBg: "bg-purple-500/10",
        icon: "text-purple-600",
    },
    red: {
        card: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20",
        title: "text-red-700 dark:text-red-300",
        value: "text-red-900 dark:text-red-100",
        subtitle: "text-red-600 dark:text-red-300",
        iconBg: "bg-red-500/10",
        icon: "text-red-600",
    },
} as const;

type StatCardVariant = keyof typeof statCardVariants;

function StatCard({
    variant,
    title,
    value,
    subtitle,
    icon: Icon,
}: {
    variant: StatCardVariant;
    title: string;
    value: React.ReactNode;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
}) {
    const v = statCardVariants[variant];
    return (
        <Card
            className={`group hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br ${v.card}`}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className={`text-sm font-medium ${v.title}`}>
                        {title}
                    </CardTitle>
                    <div
                        className={`w-10 h-10 ${v.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                        <Icon className={`h-5 w-5 ${v.icon}`} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className={`text-3xl font-bold ${v.value}`}>{value}</div>
                <p className={`text-sm ${v.subtitle} mt-1`}>{subtitle}</p>
            </CardContent>
        </Card>
    );
}

// Enhanced transaction icon component
const TransactionIcon = ({
    transaction,
}: {
    transaction: PlaidTransaction;
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    if (!transaction.categoryIcon || imageError) {
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
        [],
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
    const [earliestTransactionDate, setEarliestTransactionDate] = useState<
        string | null
    >(null);

    // Unified filter state
    const [filters, setFilters] =
        useState<TransactionFilters>(getInitialFilters);

    // Pending filter state for changes that haven't been applied yet
    const [pendingFilters, setPendingFilters] =
        useState<TransactionFilters>(getInitialFilters);

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

    const pageSize = filters.limit || 50;

    // Memoized computed values
    const currentPage = useMemo(
        () => Math.floor((filters.offset || 0) / pageSize) + 1,
        [filters.offset, pageSize],
    );

    const totalPages = useMemo(
        () => Math.ceil(pagination.total / pageSize),
        [pagination.total, pageSize],
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
                    filters.endDate || getCurrentYearRange().endDate,
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

    // Memoized category options
    const categoryOptions = useMemo(() => {
        const uniqueCategories = new Set<string>();
        availableCategories.forEach((cat) =>
            uniqueCategories.add(cat.category),
        );
        chartData.categoryData.forEach((cat) =>
            uniqueCategories.add(cat.category),
        );
        return Array.from(uniqueCategories).sort();
    }, [availableCategories, chartData.categoryData]);

    // Update filters and pending filters when search term changes
    useEffect(() => {
        const search = debouncedSearchTerm.trim() || undefined;

        setPendingFilters((prev) => ({
            ...prev,
            search,
            offset: 0,
        }));

        setFilters((prev) => ({
            ...prev,
            search,
            offset: 0,
        }));
    }, [debouncedSearchTerm]);

    // Load paginated data when filters change
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
                Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
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

            const result = await getDashboardData(earlyFilters);
            const dashboardData = result && !("error" in result) ? result : null;

            if (
                dashboardData?.transactions &&
                dashboardData.transactions.length > 0
            ) {
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

            const result = await getDashboardData(allTransactionsFilters);
            const allData = result && !("error" in result) ? result : null;
            if (allData) setAllTransactions(allData.transactions);
        } catch (error) {
            console.error(
                "Error loading all transactions for analytics:",
                error,
            );
            // Fallback to using paginated transactions if all transactions fail
            setAllTransactions(transactions);
        }
    }, [filters, transactions]);

    // Load full transaction list only when Analytics tab is active (avoids double fetch when only viewing list)
    useEffect(() => {
        if (activeTab === "analytics") {
            loadAllTransactions();
        }
    }, [activeTab, filters, loadAllTransactions]);

    // Optimized data loading for transactions list (paginated)
    const loadData = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            setChartLoading(true);

            // Load paginated transactions for the list
            const result = await getDashboardData(filters);
            const dashboardData = result && !("error" in result) ? result : null;
            if (!dashboardData) {
                setError("Failed to load transactions");
                return;
            }
            setTransactions(dashboardData.transactions);
            setTransactionStats(dashboardData.stats);
            setAvailableCategories(dashboardData.categories);
            setAccounts(dashboardData.accounts);
            setPagination(dashboardData.pagination);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to load transactions",
            );
        } finally {
            setLoading(false);
            setChartLoading(false);
        }
    }, [filters]);

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
                error instanceof Error
                    ? error.message
                    : "Failed to sync transactions",
            );
        } finally {
            setSyncing(false);
            setChartLoading(false);
        }
    }, [loadData]);

    // Pending filter change handler (dates, category, status, limit, etc.)
    const handlePendingFilterChange = useCallback(
        (key: keyof TransactionFilters, value: string | number) => {
            setPendingFilters((prev) => ({
                ...prev,
                [key]: value,
                offset: 0,
            }));
        },
        [],
    );

    const togglePendingAccountId = useCallback((accountId: string) => {
        setPendingFilters((prev) => {
            const current = prev.accountIds || [];
            const exists = current.includes(accountId);
            const next = exists
                ? current.filter((id) => id !== accountId)
                : [...current, accountId];

            return {
                ...prev,
                accountIds: next.length > 0 ? next : undefined,
                offset: 0,
            };
        });
    }, []);

    const clearPendingAccountIds = useCallback(() => {
        setPendingFilters((prev) => ({
            ...prev,
            accountIds: undefined,
            offset: 0,
        }));
    }, []);

    // Pagination handler
    const handlePageChange = useCallback((newOffset: number) => {
        setFilters((prev) => ({
            ...prev,
            offset: newOffset,
        }));
    }, []);

    // Clear all filters and reset to earliest transaction date
    const clearFilters = useCallback(() => {
        const resetFilters = {
            ...getInitialFilters(
                earliestTransactionDate || getCurrentYearRange().startDate,
            ),
            accountId: undefined,
            accountIds: undefined,
        };
        setFilters(resetFilters);
        setPendingFilters(resetFilters);
        setSearchTerm("");
    }, [earliestTransactionDate]);

    // Apply pending filters
    const applyFilters = useCallback(() => {
        setFilters(pendingFilters);
    }, [pendingFilters]);

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

    function handleChangeTransactionStatus(id: string): void {
        plaidApi.updateTransactionStatus(id).then((transaction) => {
            setTransactions((prev) =>
                prev.map((transaction) =>
                    transaction.id === id
                        ? { ...transaction, pending: !transaction.pending }
                        : transaction,
                ),
            );
        });
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
                        {[
                            {
                                variant: "blue" as const,
                                title: "Total Transactions",
                                value: transactionStats.totalCount,
                                subtitle: "Transactions",
                                icon: CreditCard,
                            },
                            {
                                variant: "green" as const,
                                title: "Total Spent",
                                value: formatCurrency(
                                    transactionStats.totalSpending,
                                ),
                                subtitle: "Total Spent",
                                icon: DollarSign,
                            },
                            {
                                variant: "purple" as const,
                                title: "Average Amount",
                                value: formatCurrency(
                                    transactionStats.averageAmount,
                                ),
                                subtitle: "Average",
                                icon: TrendingUp,
                            },
                            {
                                variant: "red" as const,
                                title: "Largest Amount",
                                value: formatCurrency(
                                    transactionStats.largestAmount,
                                ),
                                subtitle: "Largest",
                                icon: Activity,
                            },
                        ].map((stat) => (
                            <StatCard
                                key={stat.title}
                                variant={stat.variant}
                                title={stat.title}
                                value={stat.value}
                                subtitle={stat.subtitle}
                                icon={stat.icon}
                            />
                        ))}
                    </div>

                    {/* Enhanced Search and Filters - Shared between tabs */}
                    <Card className="p-6 border-0 shadow-apple-lg mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Filters
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Filter data to analyze specific time periods
                                    and categories
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
                                    {/* Start Date Input */}
                                    <Input
                                        type="date"
                                        placeholder="Start Date"
                                        value={
                                            pendingFilters.startDate?.split(
                                                "T",
                                            )[0] || ""
                                        }
                                        onChange={(e) =>
                                            handlePendingFilterChange(
                                                "startDate",
                                                e.target.value,
                                            )
                                        }
                                        className="rounded-xl"
                                    />

                                    {/* End Date Input */}
                                    <Input
                                        type="date"
                                        placeholder="End Date"
                                        value={
                                            pendingFilters.endDate?.split(
                                                "T",
                                            )[0] || ""
                                        }
                                        onChange={(e) =>
                                            handlePendingFilterChange(
                                                "endDate",
                                                e.target.value,
                                            )
                                        }
                                        className="rounded-xl"
                                    />

                                    {/* Category Filter */}
                                    <Select
                                        value={pendingFilters.category || "all"}
                                        onValueChange={(value) =>
                                            handlePendingFilterChange(
                                                "category",
                                                value === "all" ? "" : value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Categories
                                            </SelectItem>
                                            {categoryOptions.map((category) => (
                                                <SelectItem
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Status Filter */}
                                    <Select
                                        value={pendingFilters.status || "all"}
                                        onValueChange={(value) =>
                                            handlePendingFilterChange(
                                                "status",
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Status
                                            </SelectItem>
                                            <SelectItem value="completed">
                                                Completed
                                            </SelectItem>
                                            <SelectItem value="pending">
                                                Pending
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Card / Account Filter */}
                                {accounts.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Cards
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant={
                                                    !pendingFilters.accountIds ||
                                                    pendingFilters.accountIds
                                                        .length === 0
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                className="rounded-full px-3 text-xs"
                                                onClick={clearPendingAccountIds}
                                            >
                                                All cards
                                            </Button>
                                            {accounts.map((account) => {
                                                const selected =
                                                    pendingFilters.accountIds?.includes(
                                                        account.id,
                                                    ) ?? false;
                                                return (
                                                    <Button
                                                        key={account.id}
                                                        type="button"
                                                        variant={
                                                            selected
                                                                ? "default"
                                                                : "outline"
                                                        }
                                                        size="sm"
                                                        className="rounded-full px-3 text-xs"
                                                        onClick={() =>
                                                            togglePendingAccountId(
                                                                account.id,
                                                            )
                                                        }
                                                    >
                                                        {account.name}
                                                        {account.mask
                                                            ? ` ••••${account.mask}`
                                                            : ""}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Apply Filters Button */}
                                <div className="flex justify-end pb-2">
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
                            filters.search ||
                            (filters.accountIds &&
                                filters.accountIds.length > 0)) && (
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
                                {filters.accountIds &&
                                    filters.accountIds.length > 0 && (
                                        <>
                                            {filters.accountIds.map((id) => {
                                                const account = accounts.find(
                                                    (a) => a.id === id,
                                                );
                                                if (!account) return null;
                                                return (
                                                    <Badge
                                                        key={id}
                                                        variant="secondary"
                                                        className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    >
                                                        Card: {account.name}
                                                        {account.mask
                                                            ? ` ••••${account.mask}`
                                                            : ""}
                                                    </Badge>
                                                );
                                            })}
                                        </>
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
                                                {transactions.length} of{" "}
                                                {pagination.total} transactions
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={String(filters.limit)}
                                                onValueChange={(value) => {
                                                    const limit =
                                                        parseInt(value);
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        limit,
                                                        offset: 0,
                                                    }));
                                                    setPendingFilters(
                                                        (prev) => ({
                                                            ...prev,
                                                            limit,
                                                            offset: 0,
                                                        }),
                                                    );
                                                }}
                                            >
                                                <SelectTrigger className="w-32 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="25">
                                                        25 per page
                                                    </SelectItem>
                                                    <SelectItem value="50">
                                                        50 per page
                                                    </SelectItem>
                                                    <SelectItem value="100">
                                                        100 per page
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <TransactionSkeleton />
                                    ) : transactions.length === 0 ? (
                                        <EmptyState
                                            icon={CreditCard}
                                            title="No transactions found"
                                            description={
                                                searchTerm ||
                                                filters.category ||
                                                filters.startDate
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
                                            {transactions.map(
                                                (transaction, index) => (
                                                    <div
                                                        key={transaction.id}
                                                        className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-apple-lg transition-all duration-200 hover:border-primary-200 animate-slide-up"
                                                        style={{
                                                            animationDelay: `${index * 0.05}s`,
                                                        }}
                                                    >
                                                        <div className="flex items-stretch justify-between">
                                                            <div className="flex gap-4 flex-row">
                                                                <TransactionIcon
                                                                    transaction={
                                                                        transaction
                                                                    }
                                                                />

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                                            {
                                                                                transaction.name
                                                                            }
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
                                                                        <span>
                                                                            {formatDate(
                                                                                transaction.date,
                                                                            )}
                                                                        </span>
                                                                        <span>
                                                                            •
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                transaction
                                                                                    .account
                                                                                    ?.name
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    {transaction.merchantName && (
                                                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                                                            {
                                                                                transaction.merchantName
                                                                            }
                                                                        </p>
                                                                    )}

                                                                    <div className="flex gap-2 mt-3">
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                                        >
                                                                            {
                                                                                transaction.category
                                                                            }
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right flex flex-col justify-between">
                                                                <div
                                                                    className={`text-xl font-bold ${
                                                                        transaction.amount >
                                                                        0
                                                                            ? "text-red-600 dark:text-red-400"
                                                                            : "text-green-600 dark:text-green-400"
                                                                    }`}
                                                                >
                                                                    {transaction.amount >
                                                                    0
                                                                        ? "-"
                                                                        : "+"}
                                                                    {formatCurrency(
                                                                        Math.abs(
                                                                            transaction.amount,
                                                                        ),
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleChangeTransactionStatus(
                                                                            transaction.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                    Mark as{" "}
                                                                    {transaction.pending
                                                                        ? "Completed"
                                                                        : "Pending"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {/* Enhanced Pagination */}
                                    {pagination.total > pageSize && (
                                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Showing{" "}
                                                {(currentPage - 1) * pageSize +
                                                    1}{" "}
                                                to{" "}
                                                {Math.min(
                                                    currentPage * pageSize,
                                                    pagination.total,
                                                )}{" "}
                                                of {pagination.total}{" "}
                                                transactions
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handlePageChange(
                                                            Math.max(
                                                                0,
                                                                (filters.offset ||
                                                                    0) -
                                                                    pageSize,
                                                            ),
                                                        )
                                                    }
                                                    disabled={
                                                        (filters.offset ||
                                                            0) === 0
                                                    }
                                                    className="rounded-lg gap-2"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Previous
                                                </Button>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                                                    Page {currentPage} of{" "}
                                                    {totalPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handlePageChange(
                                                            (filters.offset ||
                                                                0) + pageSize,
                                                        )
                                                    }
                                                    disabled={
                                                        (filters.offset || 0) +
                                                            pageSize >=
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
                                        <strong>Debug Info:</strong> All
                                        Transactions: {allTransactions.length},
                                        Paginated Transactions:{" "}
                                        {transactions.length}, Categories:{" "}
                                        {chartData.categoryData.length}, Time
                                        Series:{" "}
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
                                                There was an issue loading the
                                                analytics section
                                            </p>
                                            <Button
                                                onClick={() =>
                                                    window.location.reload()
                                                }
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
                                        </div>
                                        <div className="h-64">
                                            {chartLoading ? (
                                                <ChartLoadingSpinner />
                                            ) : chartData.timeSeriesData
                                                  .length > 0 ? (
                                                <ChartErrorBoundary
                                                    fallback={
                                                        <ChartErrorFallback />
                                                    }
                                                >
                                                    <SpendingBarChart
                                                        data={
                                                            chartData.timeSeriesData
                                                        }
                                                        title=""
                                                    />
                                                </ChartErrorBoundary>
                                            ) : (
                                                <ChartEmptyOrError
                                                    type="empty"
                                                    message="No trend data available"
                                                    subMessage="Sync transactions to see spending trends"
                                                    icon={TrendingUp}
                                                />
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
                                                    variant={
                                                        chartView === "pie"
                                                            ? "default"
                                                            : "ghost"
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        setChartView("pie")
                                                    }
                                                    className="rounded-lg"
                                                >
                                                    <PieChart className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant={
                                                        chartView === "bar"
                                                            ? "default"
                                                            : "ghost"
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        setChartView("bar")
                                                    }
                                                    className="rounded-lg"
                                                >
                                                    <BarChart3 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="h-64">
                                            {chartLoading ? (
                                                <ChartLoadingSpinner />
                                            ) : chartData.categoryData.length >
                                              0 ? (
                                                <ChartErrorBoundary
                                                    fallback={
                                                        <ChartErrorFallback />
                                                    }
                                                >
                                                    {chartView === "pie" ? (
                                                        <CategoryPieChart
                                                            data={
                                                                chartData.categoryData
                                                            }
                                                            title=""
                                                        />
                                                    ) : (
                                                        <CategoryBarChart
                                                            data={
                                                                chartData.categoryData
                                                            }
                                                            title=""
                                                        />
                                                    )}
                                                </ChartErrorBoundary>
                                            ) : (
                                                <ChartEmptyOrError
                                                    type="empty"
                                                    message="No category data available"
                                                    subMessage="Sync transactions to see category breakdown"
                                                    icon={BarChart3}
                                                />
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
