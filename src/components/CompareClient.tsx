"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import SpendingBarChart from "@/components/charts/SpendingBarChart";
import CategoryBarChart from "@/components/charts/CategoryBarChart";
import { BarChart3, PieChart, Filter, CreditCard } from "lucide-react";
import { getDashboardData, type DashboardData } from "@/app/actions";
import { PlaidAccount, TransactionFilters } from "@/types";
import {
  formatCurrency,
  getCurrentYearRange,
  toDateString,
} from "@/lib/utils";
import {
  processCategoryData,
  processTimeSeriesData,
  calculateCreditCardMetrics,
} from "@/lib/chartUtils";
import PageHeader from "@/components/ui/page-header";
import { DashboardSkeleton } from "@/components/ui/skeleton";

const COMPARE_STORAGE_KEY = "compare-page-state";
const COMPARE_MODES = [
  { value: "date" as const, label: "Date range" },
  { value: "card" as const, label: "Card" },
  { value: "merchant" as const, label: "Merchant" },
  { value: "category" as const, label: "Category" },
];

type CompareBy = "date" | "card" | "merchant" | "category";

interface CompareFormState {
  mode: CompareBy;
  leftStart: string;
  leftEnd: string;
  rightStart: string;
  rightEnd: string;
  sharedStart: string;
  sharedEnd: string;
  leftAccountIds: string[];
  rightAccountIds: string[];
  sharedAccountIds: string[];
  leftCategory: string;
  rightCategory: string;
  sharedCategory: string;
  leftSearch: string;
  rightSearch: string;
}

function getDefaultFormState(): CompareFormState {
  const year = getCurrentYearRange();
  const now = new Date();
  const today = toDateString(now);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    mode: "date",
    leftStart: toDateString(lastMonth),
    leftEnd: toDateString(lastMonthEnd),
    rightStart: year.startDate,
    rightEnd: today,
    sharedStart: year.startDate,
    sharedEnd: today,
    leftAccountIds: [],
    rightAccountIds: [],
    sharedAccountIds: [],
    leftCategory: "",
    rightCategory: "",
    sharedCategory: "",
    leftSearch: "",
    rightSearch: "",
  };
}

function formStateFromSearchParams(params: URLSearchParams): Partial<CompareFormState> {
  const get = (k: string) => params.get(k) ?? undefined;
  const getList = (k: string) => {
    const v = params.get(k);
    return v ? v.split(",").map((id) => id.trim()).filter(Boolean) : undefined;
  };
  return {
    mode: (get("mode") as CompareBy) || undefined,
    leftStart: get("leftStart"),
    leftEnd: get("leftEnd"),
    rightStart: get("rightStart"),
    rightEnd: get("rightEnd"),
    sharedStart: get("sharedStart"),
    sharedEnd: get("sharedEnd"),
    leftAccountIds: getList("leftAccountIds"),
    rightAccountIds: getList("rightAccountIds"),
    sharedAccountIds: getList("sharedAccountIds"),
    leftCategory: get("leftCategory") ?? undefined,
    rightCategory: get("rightCategory") ?? undefined,
    sharedCategory: get("sharedCategory") ?? undefined,
    leftSearch: get("leftSearch") ?? undefined,
    rightSearch: get("rightSearch") ?? undefined,
  };
}

function formStateToParams(state: CompareFormState): URLSearchParams {
  const p = new URLSearchParams();
  p.set("mode", state.mode);
  if (state.leftStart) p.set("leftStart", state.leftStart);
  if (state.leftEnd) p.set("leftEnd", state.leftEnd);
  if (state.rightStart) p.set("rightStart", state.rightStart);
  if (state.rightEnd) p.set("rightEnd", state.rightEnd);
  if (state.sharedStart) p.set("sharedStart", state.sharedStart);
  if (state.sharedEnd) p.set("sharedEnd", state.sharedEnd);
  if (state.leftAccountIds?.length) p.set("leftAccountIds", state.leftAccountIds.join(","));
  if (state.rightAccountIds?.length) p.set("rightAccountIds", state.rightAccountIds.join(","));
  if (state.sharedAccountIds?.length) p.set("sharedAccountIds", state.sharedAccountIds.join(","));
  if (state.leftCategory) p.set("leftCategory", state.leftCategory);
  if (state.rightCategory) p.set("rightCategory", state.rightCategory);
  if (state.sharedCategory) p.set("sharedCategory", state.sharedCategory);
  if (state.leftSearch) p.set("leftSearch", state.leftSearch);
  if (state.rightSearch) p.set("rightSearch", state.rightSearch);
  return p;
}

function buildFiltersFromForm(
  state: CompareFormState,
  side: "left" | "right",
  accounts: PlaidAccount[]
): TransactionFilters {
  const base: TransactionFilters = {
    limit: 10000,
    offset: 0,
    sortBy: "date",
    sortOrder: "desc",
  };

  if (state.mode === "date") {
    base.startDate = side === "left" ? state.leftStart : state.rightStart;
    base.endDate = side === "left" ? state.leftEnd : state.rightEnd;
    if (state.sharedCategory) base.category = state.sharedCategory;
    if (state.sharedAccountIds?.length) base.accountIds = state.sharedAccountIds;
  } else if (state.mode === "card") {
    base.startDate = state.sharedStart;
    base.endDate = state.sharedEnd;
    if (state.sharedCategory) base.category = state.sharedCategory;
    const ids = side === "left" ? state.leftAccountIds : state.rightAccountIds;
    if (ids?.length) base.accountIds = ids;
  } else if (state.mode === "merchant") {
    base.startDate = state.sharedStart;
    base.endDate = state.sharedEnd;
    if (state.sharedCategory) base.category = state.sharedCategory;
    if (state.sharedAccountIds?.length) base.accountIds = state.sharedAccountIds;
    base.search = side === "left" ? state.leftSearch : state.rightSearch;
  } else {
    base.startDate = state.sharedStart;
    base.endDate = state.sharedEnd;
    if (state.sharedAccountIds?.length) base.accountIds = state.sharedAccountIds;
    const cat = side === "left" ? state.leftCategory : state.rightCategory;
    if (cat) base.category = cat;
  }

  return base;
}

export default function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<CompareFormState>(() => {
    const defaults = getDefaultFormState();
    if (typeof window === "undefined") return defaults;
    const fromUrl = formStateFromSearchParams(new URLSearchParams(searchParams.toString()));
    const hasUrlParams = searchParams.toString().length > 0;
    if (hasUrlParams) {
      return { ...defaults, ...fromUrl } as CompareFormState;
    }
    try {
      const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<CompareFormState>;
        return { ...defaults, ...parsed } as CompareFormState;
      }
    } catch (_) {}
    return defaults;
  });

  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);
  const [leftData, setLeftData] = useState<DashboardData | null>(null);
  const [rightData, setRightData] = useState<DashboardData | null>(null);
  const [chartView, setChartView] = useState<"pie" | "bar">("pie");

  const syncUrl = useCallback(
    (state: CompareFormState) => {
      const params = formStateToParams(state);
      const q = params.toString();
      const path = q ? `/compare?${q}` : "/compare";
      router.replace(path, { scroll: false });
    },
    [router]
  );

  const persistToStorage = useCallback((state: CompareFormState) => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }, []);

  const updateForm = useCallback((updates: Partial<CompareFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Sync URL and localStorage when form state changes (after commit, never during render)
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    syncUrl(formState);
    persistToStorage(formState);
  }, [formState, syncUrl, persistToStorage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getDashboardData({
        ...getCurrentYearRange(),
        limit: 1,
      });
      if (cancelled) return;
      if (result && !("error" in result)) {
        setAccounts(result.accounts);
        const cats = result.categories?.map((c) => c.category) ?? [];
        setCategoryOptions([...new Set(cats)].sort());
      }
      setInitialLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCompare = useCallback(async () => {
    setCompareLoading(true);
    setLeftData(null);
    setRightData(null);
    try {
      const leftFilters = buildFiltersFromForm(formState, "left", accounts);
      const rightFilters = buildFiltersFromForm(formState, "right", accounts);
      const [leftResult, rightResult] = await Promise.all([
        getDashboardData(leftFilters),
        getDashboardData(rightFilters),
      ]);
      if (leftResult && !("error" in leftResult)) setLeftData(leftResult);
      if (rightResult && !("error" in rightResult)) setRightData(rightResult);
      persistToStorage(formState);
      syncUrl(formState);
    } catch (e) {
      console.error("Compare failed:", e);
    } finally {
      setCompareLoading(false);
    }
  }, [formState, accounts, persistToStorage, syncUrl]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <PageHeader title="Compare" description="Side-by-side transaction analytics" />
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const leftMetrics = leftData?.transactions
    ? calculateCreditCardMetrics(leftData.transactions)
    : null;
  const rightMetrics = rightData?.transactions
    ? calculateCreditCardMetrics(rightData.transactions)
    : null;
  const leftCategoryData = leftData?.transactions
    ? processCategoryData(leftData.transactions)
    : [];
  const rightCategoryData = rightData?.transactions
    ? processCategoryData(rightData.transactions)
    : [];
  const leftTimeSeries = leftData?.transactions
    ? processTimeSeriesData(
        leftData.transactions,
        formState.mode === "date" ? formState.leftStart : formState.sharedStart,
        formState.mode === "date" ? formState.leftEnd : formState.sharedEnd
      )
    : [];
  const rightTimeSeries = rightData?.transactions
    ? processTimeSeriesData(
        rightData.transactions,
        formState.mode === "date" ? formState.rightStart : formState.sharedStart,
        formState.mode === "date" ? formState.rightEnd : formState.sharedEnd
      )
    : [];

  const leftTotal = leftMetrics?.totalSpending ?? 0;
  const rightTotal = rightMetrics?.totalSpending ?? 0;
  const diff = rightTotal - leftTotal;
  const diffPct =
    leftTotal > 0
      ? (diff / leftTotal) * 100
      : rightTotal > 0
        ? undefined
        : undefined; // N/A when no left data or both empty

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <PageHeader
        title="Compare"
        description="Side-by-side transaction analytics by date range, card, merchant, or category"
      />

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Compare by */}
        <Card className="border-0 shadow-apple-lg mb-6 bg-white dark:bg-gray-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
              Compare by
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Choose how to split the two sides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COMPARE_MODES.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={formState.mode === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateForm({ mode: value })}
                  className="rounded-full transition-colors"
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two filter panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-apple-lg bg-white dark:bg-gray-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Side A
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                {formState.mode === "date" && "Date range for the first period"}
                {formState.mode === "card" && "Accounts to include"}
                {formState.mode === "merchant" && "Merchant name to filter by"}
                {formState.mode === "category" && "Category to filter by"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formState.mode === "date" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Start
                    </label>
                    <Input
                      type="date"
                      value={formState.leftStart?.split("T")[0] ?? ""}
                      onChange={(e) => updateForm({ leftStart: e.target.value })}
                      className="rounded-xl border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      End
                    </label>
                    <Input
                      type="date"
                      value={formState.leftEnd?.split("T")[0] ?? ""}
                      onChange={(e) => updateForm({ leftEnd: e.target.value })}
                      className="rounded-xl border-gray-200 dark:border-gray-600"
                    />
                  </div>
                </>
              )}
              {formState.mode === "card" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Cards
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((acc) => {
                      const selected = formState.leftAccountIds?.includes(acc.id) ?? false;
                      return (
                        <Button
                          key={acc.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={() => {
                            const ids = formState.leftAccountIds ?? [];
                            const next = selected
                              ? ids.filter((id) => id !== acc.id)
                              : [...ids, acc.id];
                            updateForm({ leftAccountIds: next });
                          }}
                        >
                          {acc.name}
                          {acc.mask ? ` ••••${acc.mask}` : ""}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {formState.mode === "merchant" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Merchant name
                  </label>
                  <Input
                    placeholder="Search merchant..."
                    value={formState.leftSearch ?? ""}
                    onChange={(e) => updateForm({ leftSearch: e.target.value })}
                    className="rounded-xl border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
              {formState.mode === "category" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Category
                  </label>
                  <Select
                    value={formState.leftCategory || "all"}
                    onValueChange={(v) => updateForm({ leftCategory: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-apple-lg bg-white dark:bg-gray-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Side B
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                {formState.mode === "date" && "Date range for the second period"}
                {formState.mode === "card" && "Accounts to include"}
                {formState.mode === "merchant" && "Merchant name to filter by"}
                {formState.mode === "category" && "Category to filter by"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formState.mode === "date" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Start
                    </label>
                    <Input
                      type="date"
                      value={formState.rightStart?.split("T")[0] ?? ""}
                      onChange={(e) => updateForm({ rightStart: e.target.value })}
                      className="rounded-xl border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      End
                    </label>
                    <Input
                      type="date"
                      value={formState.rightEnd?.split("T")[0] ?? ""}
                      onChange={(e) => updateForm({ rightEnd: e.target.value })}
                      className="rounded-xl border-gray-200 dark:border-gray-600"
                    />
                  </div>
                </>
              )}
              {formState.mode === "card" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Cards
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((acc) => {
                      const selected = formState.rightAccountIds?.includes(acc.id) ?? false;
                      return (
                        <Button
                          key={acc.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={() => {
                            const ids = formState.rightAccountIds ?? [];
                            const next = selected
                              ? ids.filter((id) => id !== acc.id)
                              : [...ids, acc.id];
                            updateForm({ rightAccountIds: next });
                          }}
                        >
                          {acc.name}
                          {acc.mask ? ` ••••${acc.mask}` : ""}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {formState.mode === "merchant" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Merchant name
                  </label>
                  <Input
                    placeholder="Search merchant..."
                    value={formState.rightSearch ?? ""}
                    onChange={(e) => updateForm({ rightSearch: e.target.value })}
                    className="rounded-xl border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
              {formState.mode === "category" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Category
                  </label>
                  <Select
                    value={formState.rightCategory || "all"}
                    onValueChange={(v) => updateForm({ rightCategory: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shared filters */}
        <Card className="border-0 shadow-apple-lg mb-6 bg-white dark:bg-gray-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
              Shared filters
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              {formState.mode === "date"
                ? "Optional: restrict both sides to a category or cards"
                : "Date range and optional category/cards applied to both sides"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formState.mode !== "date" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Start date
                  </label>
                  <Input
                    type="date"
                    value={formState.sharedStart?.split("T")[0] ?? ""}
                    onChange={(e) => updateForm({ sharedStart: e.target.value })}
                    className="rounded-xl border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    End date
                  </label>
                  <Input
                    type="date"
                    value={formState.sharedEnd?.split("T")[0] ?? ""}
                    onChange={(e) => updateForm({ sharedEnd: e.target.value })}
                    className="rounded-xl border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            )}
            {formState.mode !== "category" && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Category (optional)
                </label>
                <Select
                  value={formState.sharedCategory || "all"}
                  onValueChange={(v) =>
                    updateForm({ sharedCategory: v === "all" ? "" : v })
                  }
                >
                  <SelectTrigger className="rounded-xl max-w-xs border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Cards (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    !formState.sharedAccountIds?.length ? "default" : "outline"
                  }
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => updateForm({ sharedAccountIds: [] })}
                >
                  All cards
                </Button>
                {accounts.map((acc) => {
                  const selected =
                    formState.sharedAccountIds?.includes(acc.id) ?? false;
                  return (
                    <Button
                      key={acc.id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        const ids = formState.sharedAccountIds ?? [];
                        const next = selected
                          ? ids.filter((id) => id !== acc.id)
                          : [...ids, acc.id];
                        updateForm({ sharedAccountIds: next });
                      }}
                    >
                      {acc.name}
                      {acc.mask ? ` ••••${acc.mask}` : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mb-8">
          <Button
            onClick={runCompare}
            disabled={compareLoading}
            className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-opacity disabled:opacity-70"
          >
            <Filter className="h-4 w-4 shrink-0" />
            {compareLoading ? "Comparing…" : "Compare"}
          </Button>
        </div>

        {/* Comparison summary row */}
        {(leftData || rightData) && (
          <Card className="shadow-apple-lg mb-8 overflow-hidden bg-white dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80">
            <CardContent className="py-6 px-6">
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10 text-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Side A total
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {leftData ? formatCurrency(leftTotal) : "No data"}
                  </p>
                  {leftMetrics && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {leftMetrics.transactionCount} transactions
                    </p>
                  )}
                </div>
                <div className="text-gray-300 dark:text-gray-500 font-medium">vs</div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Side B total
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {rightData ? formatCurrency(rightTotal) : "No data"}
                  </p>
                  {rightMetrics && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {rightMetrics.transactionCount} transactions
                    </p>
                  )}
                </div>
                <div className="border-l border-gray-200 dark:border-gray-600 pl-6 text-left min-w-[140px]">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Difference
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {diff >= 0 ? "+" : ""}
                    {formatCurrency(diff)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {diffPct !== undefined
                      ? `${diff >= 0 ? "+" : ""}${diffPct.toFixed(1)}%`
                      : rightTotal > 0
                        ? "N/A (no Side A data)"
                        : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Side-by-side results */}
        {(leftData || rightData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Side A column */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Side A
              </h2>
              {!leftData ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No data for this side.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Total spending
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {formatCurrency(leftMetrics?.totalSpending ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          Avg transaction
                        </p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {formatCurrency(leftMetrics?.averageTransaction ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          Largest
                        </p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {formatCurrency(leftMetrics?.largestTransaction ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Transactions
                        </p>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                          {leftMetrics?.transactionCount ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="border-0 shadow-apple-lg bg-white dark:bg-gray-800/50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                          By category
                        </CardTitle>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
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
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        {chartView === "pie" ? (
                          <CategoryPieChart data={leftCategoryData} />
                        ) : (
                          <CategoryBarChart data={leftCategoryData} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-apple-lg bg-white dark:bg-gray-800/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                        Spending over time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <SpendingBarChart data={leftTimeSeries} title="" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Side B column */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Side B
              </h2>
              {!rightData ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No data for this side.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Total spending
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {formatCurrency(rightMetrics?.totalSpending ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          Avg transaction
                        </p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {formatCurrency(rightMetrics?.averageTransaction ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          Largest
                        </p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {formatCurrency(rightMetrics?.largestTransaction ?? 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Transactions
                        </p>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                          {rightMetrics?.transactionCount ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="border-0 shadow-apple-lg bg-white dark:bg-gray-800/50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                          By category
                        </CardTitle>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
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
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        {chartView === "pie" ? (
                          <CategoryPieChart data={rightCategoryData} />
                        ) : (
                          <CategoryBarChart data={rightCategoryData} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-apple-lg bg-white dark:bg-gray-800/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                        Spending over time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <SpendingBarChart data={rightTimeSeries} title="" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
