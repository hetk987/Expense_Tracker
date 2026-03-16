import axios from 'axios';
import {
    LinkTokenResponse,
    ExchangeTokenRequest,
    ExchangeTokenResponse,
    PlaidAccount,
    PlaidTransaction,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Client API for Plaid and account operations that must stay as HTTP routes
 * (e.g. link token, exchange token, webhook, sync, unlink).
 * Budget and dashboard data use server actions instead.
 */
export const plaidApi = {
    createLinkToken: async (): Promise<LinkTokenResponse> => {
        const response = await api.post<LinkTokenResponse>('/api/plaid/create-link-token');
        return response.data;
    },

    exchangePublicToken: async (publicToken: string): Promise<ExchangeTokenResponse> => {
        const response = await api.post<ExchangeTokenResponse>('/api/plaid/exchange-token', {
            public_token: publicToken,
        } as ExchangeTokenRequest);
        return response.data;
    },

    getAccounts: async (): Promise<PlaidAccount[]> => {
        const response = await api.get<PlaidAccount[]>('/api/plaid/accounts');
        return response.data;
    },

    updateTransactionStatus: async (id: string): Promise<PlaidTransaction> => {
        const response = await api.put<PlaidTransaction>(`/api/plaid/transactions/${id}`);
        return response.data;
    },

    syncTransactions: async (): Promise<{ message: string }> => {
        const response = await api.post<{ message: string }>('/api/plaid/sync');
        return response.data;
    },

    unlinkAccount: async (accountId: string): Promise<{
        success: boolean;
        message: string;
        deletedTransactions: number;
        accountName: string;
    }> => {
        const response = await api.delete(`/api/plaid/accounts/unlink?accountId=${accountId}`);
        return response.data;
    },

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
