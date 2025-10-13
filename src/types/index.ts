import { Decimal } from "@prisma/client/runtime/library";

export interface PlaidAccount {
    id: string;
    plaidAccountId: string;
    name: string;
    mask?: string;
    type: string;
    subtype?: string;
    institutionId: string;
    createdAt: string;
    updatedAt: string;
    transactions?: PlaidTransaction[];
}

export interface PlaidTransaction {
    id: string;
    plaidTransactionId: string;
    accountId: string;
    amount: number;
    currency: string;
    date: string;
    name: string;
    merchantName?: string;
    category: string;
    categoryIcon?: string;
    pending: boolean;
    paymentChannel?: string;
    transactionType?: string;
    createdAt: string;
    updatedAt: string;
    account?: PlaidAccount;
}

export interface LinkTokenResponse {
    link_token: string;
}

export interface ExchangeTokenRequest {
    public_token: string;
}

export interface ExchangeTokenResponse {
    message: string;
    accounts: {
        id: string;
        name: string;
        type: string;
        subtype: string;
        mask?: string;
    }[];
    duplicateAccounts?: {
        id: string;
        name: string;
        type: string;
        subtype: string;
        mask?: string;
    }[];
}

export interface TransactionsResponse {
    transactions: PlaidTransaction[];
    total: number;
    hasMore: boolean;
}

export interface TransactionFilters {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    category?: string;
    search?: string;
    status?: string;
    sortBy?: "date" | "amount" | "name";
    sortOrder?: "asc" | "desc";
}

export interface CategoryData {
    category: string;
    amount: number;
    count: number;
    percentage: number;
}

export interface TimeSeriesData {
    date: string;
    amount: number;
    count: number;
}

export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string[];
        borderColor?: string;
        borderWidth?: number;
    }[];
}

export interface CategoryStats {
    category: string;
    count: number;
    totalAmount: number;
    averageAmount: number;
}

// Budget-related interfaces
export interface Budget {
    id: string;
    userId: string;
    name: string;
    budgetType: "CATEGORY" | "MERCHANT" | "ACCOUNT" | "TOTAL";
    targetValue?: string;
    merchantName?: string;
    accountId?: string;
    amount: number;
    period: "MONTHLY" | "WEEKLY" | "YEARLY" | "CUSTOM";
    startDate: string;
    endDate?: string;
    isActive: boolean;
    alertThreshold: number;
    createdAt: string;
    updatedAt: string;
    account?: PlaidAccount;
    alerts?: BudgetAlert[];
}

export interface BudgetAlert {
    id: string;
    budgetId: string;
    alertType: "WARNING" | "EXCEEDED" | "APPROACHING";
    triggeredAt: string;
    amount: number;
    percentage: number;
    isRead: boolean;
    budget?: Budget;
}

export interface BudgetProgress {
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
    daysRemaining: number;
    isOverBudget: boolean;
    projectedSpend: number;
}

export interface BudgetFilters {
    budgetType?: string;
    period?: string;
    isActive?: boolean;
    accountId?: string;
}

export interface CreateBudgetRequest {
    name: string;
    budgetType: "CATEGORY" | "MERCHANT" | "ACCOUNT" | "TOTAL";
    targetValue?: string;
    merchantName?: string;
    accountId?: string;
    amount: number;
    period: "MONTHLY" | "WEEKLY" | "YEARLY" | "CUSTOM";
    startDate: string;
    endDate?: string;
    alertThreshold?: number;
}

export interface BudgetSummary {
    totalBudgets: number;
    activeBudgets: number;
    exceededBudgets: number;
    totalBudgetAmount: number;
    totalSpent: number;
    averageAdherence: number;
}

// Enhanced Analytics interfaces
export interface MonthlySpendingData {
    month: string;
    currentYear: number;
    previousYear: number;
    budgetAmount?: number;
    category?: string;
}

export interface DailySpendingData {
    date: string;
    amount: number;
    transactionCount: number;
}

export interface MerchantSpendingData {
    merchantName: string;
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    trend: "up" | "down" | "stable";
    category: string;
}

export interface SpendingTrend {
    period: string;
    amount: number;
    change: number;
    changePercentage: number;
}

export interface FinancialHealthScore {
    score: number;
    budgetAdherence: number;
    savingsRate: number;
    spendingConsistency: number;
    recommendations: string[];
} 