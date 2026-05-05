'use server';

import { BudgetService } from '@/lib/budgetService';
import { PlaidService } from '@/lib/plaidService';
import { getUserId, getUserInfo } from '@/lib/clerkHelpers';
import { convertPrismaTransactions } from '@/lib/utils';
import type {
    Budget,
    BudgetProgress,
    BudgetAlert,
    BudgetSummary,
    CreateBudgetRequest,
    BudgetFilters,
    TransactionFilters,
    PlaidAccount,
    CategoryStats,
    PlaidTransaction,
    UpdateTransactionPayload,
} from '@/types';

function requireUserId(): Promise<string> {
    return getUserId().then((id) => {
        if (!id) throw new Error('Unauthorized');
        return id;
    });
}

// --- Dashboard / Plaid data (for RSC and client refetch) ---

export type DashboardData = {
    transactions: PlaidTransaction[];
    stats: {
        totalCount: number;
        totalSpending: number;
        averageAmount: number;
        largestAmount: number;
    };
    categories: CategoryStats[];
    accounts: PlaidAccount[];
    pagination: { total: number; limit: number; offset: number };
};

export async function getAccounts(): Promise<PlaidAccount[] | { error: string }> {
    try {
        await requireUserId();
        const accounts = await PlaidService.getAccounts();
        return accounts.map((a: any) => ({
            ...a,
            createdAt: typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt as Date).toISOString(),
            updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : (a.updatedAt as Date).toISOString(),
        }));
    } catch (e) {
        console.error('getAccounts error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get accounts' };
    }
}

export async function getCategories(filters: TransactionFilters = {}): Promise<CategoryStats[] | { error: string }> {
    try {
        await requireUserId();
        return await PlaidService.getCategories(filters);
    } catch (e) {
        console.error('getCategories error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get categories' };
    }
}

export async function getDashboardData(filters: TransactionFilters = {}): Promise<DashboardData | { error: string }> {
    try {
        await requireUserId();
        const [transactionsData, categoriesData, accountsData] = await Promise.all([
            PlaidService.getTransactionsWithStats(filters),
            PlaidService.getCategories(filters),
            PlaidService.getAccounts(),
        ]);
        const transactions = convertPrismaTransactions(transactionsData.transactions).map((t: any) => ({
            ...t,
            date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString(),
            createdAt: typeof t.createdAt === 'string' ? t.createdAt : (t.createdAt as Date).toISOString(),
            updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : (t.updatedAt as Date).toISOString(),
            account: t.account
                ? {
                      ...t.account,
                      createdAt: typeof t.account.createdAt === 'string' ? t.account.createdAt : (t.account.createdAt as Date).toISOString(),
                      updatedAt: typeof t.account.updatedAt === 'string' ? t.account.updatedAt : (t.account.updatedAt as Date).toISOString(),
                  }
                : undefined,
        })) as PlaidTransaction[];
        const accounts = accountsData.map((a: any) => ({
            ...a,
            createdAt: typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt as Date).toISOString(),
            updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : (a.updatedAt as Date).toISOString(),
        }));
        return {
            transactions,
            stats: transactionsData.stats,
            categories: categoriesData,
            accounts,
            pagination: {
                total: transactionsData.stats.totalCount,
                limit: filters.limit || 50,
                offset: filters.offset || 0,
            },
        };
    } catch (e) {
        console.error('getDashboardData error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to load dashboard data' };
    }
}

export async function updateTransactionAction(
    payload: UpdateTransactionPayload
): Promise<PlaidTransaction | { error: string }> {
    try {
        await requireUserId();

        const { id, ...updates } = payload;
        const updatedPrisma = await PlaidService.updateTransaction(id, updates);
        if (!updatedPrisma) {
            throw new Error('Transaction not found');
        }

        const [converted] = convertPrismaTransactions([updatedPrisma as any]) as PlaidTransaction[];

        return {
            ...converted,
            date:
                typeof converted.date === 'string'
                    ? converted.date
                    : (converted.date as unknown as Date).toISOString(),
            createdAt:
                typeof converted.createdAt === 'string'
                    ? converted.createdAt
                    : (converted.createdAt as unknown as Date).toISOString(),
            updatedAt:
                typeof converted.updatedAt === 'string'
                    ? converted.updatedAt
                    : (converted.updatedAt as unknown as Date).toISOString(),
            account: converted.account
                ? {
                      ...converted.account,
                      createdAt:
                          typeof converted.account.createdAt === 'string'
                              ? converted.account.createdAt
                              : (converted.account.createdAt as unknown as Date).toISOString(),
                      updatedAt:
                          typeof converted.account.updatedAt === 'string'
                              ? converted.account.updatedAt
                              : (converted.account.updatedAt as unknown as Date).toISOString(),
                  }
                : undefined,
        };
    } catch (e) {
        console.error('updateTransactionAction error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to update transaction' };
    }
}

export async function deleteTransactionAction(
    id: string
): Promise<{ success: boolean } | { error: string }> {
    try {
        await requireUserId();
        await PlaidService.deleteTransaction(id);
        return { success: true };
    } catch (e) {
        console.error('deleteTransactionAction error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to delete transaction' };
    }
}

// --- Budget actions ---

export async function getBudgets(filters?: BudgetFilters): Promise<Budget[] | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.getBudgets(userId, filters);
    } catch (e) {
        console.error('getBudgets error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get budgets' };
    }
}

export async function getBudget(budgetId: string): Promise<Budget | null | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.getBudgetById(budgetId, userId);
    } catch (e) {
        console.error('getBudget error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get budget' };
    }
}

export async function createBudget(budgetData: CreateBudgetRequest): Promise<Budget | { error: string }> {
    try {
        const userId = await requireUserId();
        const budget = await BudgetService.createBudget(userId, budgetData);
        try {
            const userInfo = await getUserInfo();
            if (userInfo) {
                await BudgetService.checkBudgetAlerts(userId, userInfo.email, userInfo.name);
            }
        } catch {
            // ignore alert check failure
        }
        return budget;
    } catch (e) {
        console.error('createBudget error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to create budget' };
    }
}

export async function updateBudget(
    budgetId: string,
    updates: Partial<CreateBudgetRequest>
): Promise<Budget | null | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.updateBudget(budgetId, userId, updates);
    } catch (e) {
        console.error('updateBudget error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to update budget' };
    }
}

export async function deleteBudget(budgetId: string): Promise<{ success: boolean } | { error: string }> {
    try {
        const userId = await requireUserId();
        await BudgetService.deleteBudgetAlerts(budgetId);
        const success = await BudgetService.deleteBudget(budgetId, userId);
        return { success };
    } catch (e) {
        console.error('deleteBudget error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to delete budget' };
    }
}

export async function getBudgetProgress(budgetId: string): Promise<BudgetProgress | null | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.calculateBudgetProgress(budgetId, userId);
    } catch (e) {
        console.error('getBudgetProgress error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get budget progress' };
    }
}

export async function getAllBudgetProgress(): Promise<BudgetProgress[] | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.getAllBudgetProgress(userId);
    } catch (e) {
        console.error('getAllBudgetProgress error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get budget progress' };
    }
}

export async function getBudgetSummary(): Promise<BudgetSummary | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.getBudgetSummary(userId);
    } catch (e) {
        console.error('getBudgetSummary error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get budget summary' };
    }
}

export async function getBudgetAlerts(): Promise<BudgetAlert[] | { error: string }> {
    try {
        const userId = await requireUserId();
        return await BudgetService.getUnreadAlerts(userId);
    } catch (e) {
        console.error('getBudgetAlerts error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to get alerts' };
    }
}

export async function markAlertAsRead(alertId: string): Promise<{ success: boolean } | { error: string }> {
    try {
        const userId = await requireUserId();
        const success = await BudgetService.markAlertAsRead(alertId, userId);
        return { success };
    } catch (e) {
        console.error('markAlertAsRead error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to mark alert as read' };
    }
}

export async function checkBudgetAlerts(): Promise<
    { success: boolean; alerts: BudgetAlert[]; message: string } | { error: string }
> {
    try {
        const userId = await requireUserId();
        const userInfo = await getUserInfo();
        const email = userInfo?.email ?? '';
        const name = userInfo?.name ?? 'User';
        const alerts = await BudgetService.checkBudgetAlerts(userId, email, name);
        return { success: true, alerts, message: 'Alerts checked' };
    } catch (e) {
        console.error('checkBudgetAlerts error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to check alerts' };
    }
}

export async function resendAlertEmail(alertId: string): Promise<{ success: boolean; message: string } | { error: string }> {
    try {
        const userId = await requireUserId();
        const userInfo = await getUserInfo();
        const email = userInfo?.email ?? '';
        const name = userInfo?.name ?? 'User';
        const success = await BudgetService.resendAlertEmail(alertId, userId, email, name);
        return { success, message: success ? 'Email sent' : 'Failed to send' };
    } catch (e) {
        console.error('resendAlertEmail error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to resend email' };
    }
}

export async function sendWeeklySummary(): Promise<{ success: boolean; message: string } | { error: string }> {
    try {
        const userId = await requireUserId();
        const userInfo = await getUserInfo();
        const email = userInfo?.email ?? '';
        const name = userInfo?.name ?? 'User';
        await BudgetService.sendWeeklySummary(userId, email, name);
        return { success: true, message: 'Summary sent' };
    } catch (e) {
        console.error('sendWeeklySummary error:', e);
        return { error: e instanceof Error ? e.message : 'Failed to send summary' };
    }
}
