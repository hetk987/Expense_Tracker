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
} from '@/types';

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

    // Get transactions with optional filtering
    getTransactions: async (filters: TransactionFilters = {}): Promise<TransactionsResponse> => {
        const params = new URLSearchParams();

        if (filters.accountId) params.append('accountId', filters.accountId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.offset) params.append('offset', filters.offset.toString());
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await api.get<TransactionsResponse>(`/api/plaid/transactions?${params.toString()}`);
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

    // Get transaction statistics
    getTransactionStats: async (filters: TransactionFilters = {}): Promise<{
        totalCount: number;
        totalSpending: number;
        averageAmount: number;
        largestAmount: number;
    }> => {
        const params = new URLSearchParams();

        if (filters.accountId) params.append('accountId', filters.accountId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);

        const response = await api.get(`/api/plaid/transactions/stats?${params.toString()}`);
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

export default api;