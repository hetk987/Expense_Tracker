import axios from 'axios';
import {
    LinkTokenResponse,
    ExchangeTokenRequest,
    ExchangeTokenResponse,
    PlaidAccount,
    TransactionsResponse,
    TransactionFilters,
    CategoryData,
    CategoryStats,
    Budget,
    BudgetProgress,
    BudgetAlert,
    BudgetSummary,
    CreateBudgetRequest,
    BudgetFilters,
} from '@/types';
import { buildTransactionParams } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const plaidApi = {
    // Create a link token for Plaid Link
    createLinkToken: async (): Promise<LinkTokenResponse> => {
        const response = await api.post<LinkTokenResponse>('/api/plaid/create-link-token');
        return response.data;
    },

    // Exchange public token for access token
    exchangePublicToken: async (publicToken: string): Promise<ExchangeTokenResponse> => {
        const response = await api.post<ExchangeTokenResponse>('/api/plaid/exchange-token', {
            public_token: publicToken,
        } as ExchangeTokenRequest);
        return response.data;
    },

    // Get all linked accounts
    getAccounts: async (): Promise<PlaidAccount[]> => {
        const response = await api.get<PlaidAccount[]>('/api/plaid/accounts');
        return response.data;
    },



    // Get all categories
    getCategories: async (filters?: { accountId?: string; startDate?: string; endDate?: string }): Promise<CategoryStats[]> => {
        const params = new URLSearchParams();

        if (filters?.accountId) params.append('accountId', filters.accountId);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);

        const response = await api.get<CategoryStats[]>(`/api/plaid/categories?${params.toString()}`);
        return response.data;
    },



    // Get unified dashboard data (transactions, stats, categories, accounts)
    getDashboardData: async (filters: TransactionFilters = {}): Promise<{
        transactions: any[];
        stats: {
            totalCount: number;
            totalSpending: number;
            averageAmount: number;
            largestAmount: number;
        };
        categories: CategoryStats[];
        accounts: PlaidAccount[];
        pagination: {
            total: number;
            limit: number;
            offset: number;
        };
    }> => {
        const params = buildTransactionParams(filters);
        const response = await api.get(`/api/plaid/transactions/dashboard?${params.toString()}`);
        return response.data;
    },

    // Manually trigger transaction sync
    syncTransactions: async (): Promise<{ message: string }> => {
        const response = await api.post<{ message: string }>('/api/plaid/sync');
        return response.data;
    },

    // Unlink a single account
    unlinkAccount: async (accountId: string): Promise<{
        success: boolean;
        message: string;
        deletedTransactions: number;
        accountName: string;
    }> => {
        const response = await api.delete(`/api/plaid/accounts/unlink?accountId=${accountId}`);
        return response.data;
    },

    // Unlink multiple accounts
    unlinkAccounts: async (accountIds: string[]): Promise<{
        success: boolean;
        results: any[];
        errors: any[];
        totalProcessed: number;
        successful: number;
        failed: number;
    }> => {
        const response = await api.delete(`/api/plaid/accounts/unlink?accountIds=${accountIds.join(',')}`);
        return response.data;
    },
};

export const budgetApi = {
    // Get all budgets
    getBudgets: async (filters?: BudgetFilters): Promise<Budget[]> => {
        const params = new URLSearchParams();
        if (filters?.budgetType) params.append('budgetType', filters.budgetType);
        if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
        if (filters?.accountId) params.append('accountId', filters.accountId);

        const response = await api.get<Budget[]>(`/api/budgets?${params.toString()}`);
        return response.data;
    },

    // Get specific budget by ID
    getBudget: async (budgetId: string): Promise<Budget> => {
        const response = await api.get<Budget>(`/api/budgets/${budgetId}`);
        return response.data;
    },

    // Create new budget
    createBudget: async (budgetData: CreateBudgetRequest): Promise<Budget> => {
        const response = await api.post<Budget>('/api/budgets', budgetData);
        return response.data;
    },

    // Update existing budget
    updateBudget: async (budgetId: string, updates: Partial<CreateBudgetRequest>): Promise<Budget> => {
        const response = await api.put<Budget>(`/api/budgets/${budgetId}`, updates);
        return response.data;
    },

    // Delete budget
    deleteBudget: async (budgetId: string): Promise<{ success: boolean }> => {
        const response = await api.delete<{ success: boolean }>(`/api/budgets/${budgetId}`);
        return response.data;
    },

    // Get budget progress for specific budget
    getBudgetProgress: async (budgetId: string): Promise<BudgetProgress> => {
        const response = await api.get<BudgetProgress>(`/api/budgets/${budgetId}/progress`);
        return response.data;
    },

    // Get progress for all budgets
    getAllBudgetProgress: async (): Promise<BudgetProgress[]> => {
        const response = await api.get<BudgetProgress[]>('/api/budgets/progress');
        return response.data;
    },

    // Get budget summary statistics
    getBudgetSummary: async (): Promise<BudgetSummary> => {
        const response = await api.get<BudgetSummary>('/api/budgets/summary');
        return response.data;
    },

    // Get unread budget alerts
    getBudgetAlerts: async (): Promise<BudgetAlert[]> => {
        const response = await api.get<BudgetAlert[]>('/api/budgets/alerts');
        return response.data;
    },

    // Mark alert as read
    markAlertAsRead: async (alertId: string): Promise<{ success: boolean }> => {
        const response = await api.post<{ success: boolean }>(`/api/budgets/alerts/${alertId}`);
        return response.data;
    },

    // Check budget alerts manually (triggers email notifications)
    checkBudgetAlerts: async (userEmail?: string, userName?: string): Promise<{ success: boolean; alerts: BudgetAlert[]; message: string }> => {
        const response = await api.post<{ success: boolean; alerts: BudgetAlert[]; message: string }>('/api/budgets/alerts/check', {
            userEmail,
            userName
        });
        return response.data;
    },

    // Send weekly budget summary
    sendWeeklySummary: async (userEmail?: string, userName?: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post<{ success: boolean; message: string }>('/api/budgets/summary/weekly', {
            userEmail,
            userName
        });
        return response.data;
    },
};

export default api;