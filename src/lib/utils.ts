import { type ClassValue, clsx } from "clsx"
import { TransactionFilters } from "@/types"

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs)
}

/**
 * Utility function to parse URL search parameters into TransactionFilters
 * Eliminates redundant parameter parsing across API endpoints
 */
export function parseTransactionFilters(searchParams: URLSearchParams): TransactionFilters {
    return {
        accountId: searchParams.get('accountId') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
        category: searchParams.get('category') || undefined,
        search: searchParams.get('search') || undefined,
        status: searchParams.get('status') || undefined,
        sortBy: searchParams.get('sortBy') as "date" | "amount" | "name" | undefined,
        sortOrder: searchParams.get('sortOrder') as "asc" | "desc" | undefined,
    };
}

/**
 * Utility function to build URL search parameters from TransactionFilters
 * Eliminates redundant parameter building in API client methods
 */
export function buildTransactionParams(filters: TransactionFilters): URLSearchParams {
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

    return params;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}

export function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function getMonthName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long' });
}

export function getCurrentMonthRange() {
    const now = new Date();
    // Use UTC to avoid timezone issues
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
    };
}

export function getCurrentYearRange() {
    const now = new Date();
    // Use UTC to avoid timezone issues
    const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1)); // January 1st of current year
    const endOfYear = new Date(Date.UTC(now.getFullYear(), 11, 31)); // December 31st of current year

    return {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: endOfYear.toISOString().split('T')[0],
    };
}

export function getLast30DaysRange() {
    const now = new Date();
    // Use UTC to avoid timezone issues when subtracting days
    const nowUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const thirtyDaysAgo = new Date(nowUTC.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: nowUTC.toISOString().split('T')[0],
    };
}

export function getEarliestTransactionDateRange(earliestDate: string) {
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    return {
        startDate: earliestDate,
        endDate: nowUTC.toISOString().split('T')[0],
    };
}

/**
 * Simple utility to convert Prisma transactions with Decimal amounts to number amounts
 */
export function convertPrismaTransactions<T extends { amount: any }>(transactions: T[]): (T & { amount: number })[] {
    return transactions.map(t => ({ ...t, amount: Number(t.amount) }));
} 