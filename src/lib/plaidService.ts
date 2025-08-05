import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { prisma } from './prismaClient';
import { getCurrentYearRange } from './utils';
import { Decimal } from '@prisma/client/runtime/library';
import { TRANSACTION_LIMITS, PAGINATION } from './constants';
import { filterOutCreditCardPaymentsPartial } from './chartUtils';

const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
            'PLAID-SECRET': process.env.PLAID_SECRET!,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

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

export class PlaidService {
    /**
     * Creates a link token for Plaid Link integration
     */
    static async createLinkToken(): Promise<string> {
        try {
            const request = {
                user: { client_user_id: 'user-id' },
                client_name: 'Expense Tracker',
                products: [Products.Transactions],
                country_codes: [CountryCode.Us],
                language: 'en',
                webhook: process.env.PLAID_WEBHOOK_URL,
            };

            const response = await plaidClient.linkTokenCreate(request);

            // Store the link token in database
            await prisma.plaidLinkToken.create({
                data: {
                    token: response.data.link_token,
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                },
            });

            return response.data.link_token;
        } catch (error) {
            console.error('Error creating link token:', error);
            throw error;
        }
    }

    /**
     * Exchanges a public token (from Plaid Link) for an access token
     */
    static async exchangePublicToken(publicToken: string): Promise<{ access_token: string; accounts: any[]; duplicateAccounts?: any[] }> {
        try {
            const response = await plaidClient.itemPublicTokenExchange({
                public_token: publicToken,
            });

            const accessToken = response.data.access_token;
            const itemId = response.data.item_id;

            // Get item information to get institution_id
            const itemResponse = await plaidClient.itemGet({
                access_token: accessToken,
            });

            const institutionId = itemResponse.data.item.institution_id || 'unknown';

            // Get accounts for this access token
            const accountsResponse = await plaidClient.accountsGet({
                access_token: accessToken,
            });

            // Check for duplicate accounts before creating new ones
            const duplicateAccounts = [];
            const newAccounts = [];

            for (const account of accountsResponse.data.accounts) {
                const existingAccount = await prisma.plaidAccount.findUnique({
                    where: {
                        plaidAccountId: account.account_id,
                    },
                });

                if (existingAccount) {
                    console.log(`Duplicate account found: ${account.name} (${account.account_id})`);
                    duplicateAccounts.push(existingAccount);
                } else {
                    console.log(`New account found: ${account.name} (${account.account_id})`);
                    newAccounts.push(account);
                }
            }

            console.log(`Total accounts: ${accountsResponse.data.accounts.length}, New: ${newAccounts.length}, Duplicates: ${duplicateAccounts.length}`);

            // If all accounts are duplicates, return early with duplicate info
            if (duplicateAccounts.length > 0 && newAccounts.length === 0) {
                console.log('All accounts are duplicates, skipping database operations');
                return {
                    access_token: accessToken,
                    accounts: [],
                    duplicateAccounts: duplicateAccounts,
                };
            }

            // If there are no accounts at all, return empty response
            if (accountsResponse.data.accounts.length === 0) {
                console.log('No accounts found, skipping database operations');
                return {
                    access_token: accessToken,
                    accounts: [],
                };
            }

            // Only create link token if we have new accounts to save
            const linkToken = await prisma.plaidLinkToken.create({
                data: {
                    token: `link_${Date.now()}`, // Generate a unique token
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                },
            });

            // Store only new accounts in database (duplicates are excluded)
            console.log(`Creating ${newAccounts.length} new account records in database`);
            const createdAccounts = await Promise.all(
                newAccounts.map(async (account) => {
                    return await prisma.plaidAccount.create({
                        data: {
                            plaidAccountId: account.account_id,
                            name: account.name,
                            mask: account.mask,
                            type: account.type,
                            subtype: account.subtype,
                            institutionId: institutionId,
                            linkTokenId: linkToken.id,
                            accessToken: accessToken,
                        },
                    });
                })
            );

            console.log(`Successfully processed: ${createdAccounts.length} new accounts, ${duplicateAccounts.length} duplicates skipped`);

            // If we found duplicates during creation, update the response
            if (duplicateAccounts.length > 0 && createdAccounts.length === 0) {
                console.log('All accounts were duplicates, returning duplicate info');
                return {
                    access_token: accessToken,
                    accounts: [],
                    duplicateAccounts: duplicateAccounts,
                };
            }

            return {
                access_token: accessToken,
                accounts: createdAccounts,
                duplicateAccounts: duplicateAccounts.length > 0 ? duplicateAccounts : undefined,
            };
        } catch (error) {
            console.error('Error exchanging public token:', error);
            throw error;
        }
    }

    /**
     * Fetches all accounts from database
     */
    static async getAccounts() {
        try {
            const accounts = await prisma.plaidAccount.findMany({
                orderBy: {
                    name: 'asc',
                },
            });

            return accounts;
        } catch (error) {
            console.error('Error getting accounts:', error);
            throw error;
        }
    }

    /**
     * Fetches transactions from database with optional filtering
     */
    static async getTransactions(filters: TransactionFilters = {}) {
        try {
            const where: any = {};

            if (filters.accountId) {
                where.accountId = filters.accountId;
            }

            if (filters.startDate) {
                where.date = {
                    ...where.date,
                    gte: new Date(filters.startDate),
                };
            }

            if (filters.endDate) {
                where.date = {
                    ...where.date,
                    lte: new Date(filters.endDate),
                };
            }

            if (filters.category && filters.category !== 'all') {
                where.category = filters.category;
            }

            if (filters.search) {
                where.OR = [
                    {
                        name: {
                            contains: filters.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        merchantName: {
                            contains: filters.search,
                            mode: 'insensitive',
                        },
                    },
                ];
            }

            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'pending') {
                    where.pending = true;
                } else if (filters.status === 'completed') {
                    where.pending = false;
                }
            }

            // Determine sort order
            let orderBy: any = {};
            if (filters.sortBy) {
                switch (filters.sortBy) {
                    case 'date':
                        orderBy.date = filters.sortOrder || 'desc';
                        break;
                    case 'amount':
                        orderBy.amount = filters.sortOrder || 'desc';
                        break;
                    case 'name':
                        orderBy.name = filters.sortOrder || 'asc';
                        break;
                    default:
                        orderBy.date = 'desc';
                }
            } else {
                orderBy.date = 'desc';
            }

            const transactions = await prisma.plaidTransaction.findMany({
                where,
                include: {
                    account: true,
                },
                orderBy,
                take: filters.limit || TRANSACTION_LIMITS.DASHBOARD,
                skip: filters.offset || PAGINATION.DEFAULT_OFFSET,
            });

            const total = await prisma.plaidTransaction.count({ where });

            return {
                transactions,
                total,
                hasMore: (filters.offset || PAGINATION.DEFAULT_OFFSET) + (filters.limit || TRANSACTION_LIMITS.DASHBOARD) < total,
            };
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    /**
     * Gets transaction statistics with optional filtering
     * Excludes credit card payments from spending calculations
     */
    static async getTransactionStats(filters: TransactionFilters = {}) {
        try {
            const where: any = {};

            if (filters.accountId) {
                where.accountId = filters.accountId;
            }

            if (filters.startDate) {
                where.date = {
                    ...where.date,
                    gte: new Date(filters.startDate),
                };
            }

            if (filters.endDate) {
                where.date = {
                    ...where.date,
                    lte: new Date(filters.endDate),
                };
            }

            if (filters.category && filters.category !== 'all') {
                where.category = filters.category;
            }

            if (filters.search) {
                where.OR = [
                    {
                        name: {
                            contains: filters.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        merchantName: {
                            contains: filters.search,
                            mode: 'insensitive',
                        },
                    },
                ];
            }

            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'pending') {
                    where.pending = true;
                } else if (filters.status === 'completed') {
                    where.pending = false;
                }
            }

            // Get all transactions to filter out credit card payments
            const allTransactionsRaw = await prisma.plaidTransaction.findMany({
                where,
                select: {
                    id: true,
                    amount: true,
                    name: true,
                    merchantName: true,
                    category: true,
                },
            });
            const allTransactions = allTransactionsRaw.map(t => ({
                ...t,
                amount: Number(t.amount),
            }));
            // Filter out credit card payments (partial)
            const filteredTransactions = filterOutCreditCardPaymentsPartial(allTransactions);
            console.log(filteredTransactions);
            // Calculate statistics on filtered transactions
            const totalCount = filteredTransactions.length;

            const totalSpending = filteredTransactions
                .filter(t => t.amount > 0) // Only count expenses (positive amounts)
                .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
            const averageAmount = totalCount > 0 ? totalSpending / totalCount : 0;

            // Get largest expense transaction
            const largestTransaction = filteredTransactions
                .filter(t => t.amount > 0) // Only expenses
                .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))[0];

            const largestAmount = largestTransaction ? Math.abs(Number(largestTransaction.amount)) : 0;

            return {
                totalCount,
                totalSpending,
                averageAmount,
                largestAmount,
            };
        } catch (error) {
            console.error('Error getting transaction stats:', error);
            throw error;
        }
    }

    /**
     * Gets transactions with aggregated stats in a single optimized query
     * Excludes credit card payments at database level
     */
    static async getTransactionsWithStats(filters: TransactionFilters = {}) {
        try {
            const where = this.buildWhereClause(filters);

            // Single query to get transactions with aggregated stats
            const [transactions, stats] = await Promise.all([
                prisma.plaidTransaction.findMany({
                    where: {
                        ...where,
                        // Exclude credit card payments at database level
                        NOT: {
                            AND: [
                                { name: { contains: 'INTERNET PAYMENT - THANK YOU', mode: 'insensitive' } },
                                { merchantName: null },
                                { category: 'LOAN_PAYMENTS' }
                            ]
                        }
                    },
                    include: { account: true },
                    orderBy: this.buildOrderBy(filters),
                    take: filters.limit || TRANSACTION_LIMITS.DASHBOARD,
                    skip: filters.offset || PAGINATION.DEFAULT_OFFSET,
                }),

                // Get stats in a single aggregation query
                prisma.plaidTransaction.aggregate({
                    where: {
                        ...where,
                        amount: { gt: 0 }, // Only expenses
                        NOT: {
                            AND: [
                                { name: { contains: 'INTERNET PAYMENT - THANK YOU', mode: 'insensitive' } },
                                { merchantName: null },
                                { category: 'LOAN_PAYMENT' }
                            ]
                        }
                    },
                    _count: true,
                    _sum: { amount: true },
                    _avg: { amount: true },
                    _max: { amount: true }
                })
            ]);

            console.log('getTransactionsWithStats - stats:', stats);
            console.log('getTransactionsWithStats - transactions count:', transactions.length);

            return {
                transactions,
                stats: {
                    totalCount: stats._count,
                    totalSpending: Math.abs(Number(stats._sum.amount || 0)),
                    averageAmount: Math.abs(Number(stats._avg.amount || 0)),
                    largestAmount: Math.abs(Number(stats._max.amount || 0))
                }
            };
        } catch (error) {
            console.error('Error getting transactions with stats:', error);
            throw error;
        }
    }

    /**
     * Fetches all transactions from Plaid with proper pagination handling
     * This method handles the 100 transaction limit by making multiple API calls
     * 
     * @param accessToken - Plaid access token for the account
     * @param startDate - Start date in YYYY-MM-DD format
     * @param endDate - End date in YYYY-MM-DD format
     * @param accountIds - Optional array of specific account IDs to fetch
     * @returns Promise<Array> - Array of all transactions
     */
    static async fetchAllTransactions(
        accessToken: string,
        startDate: string,
        endDate: string,
        accountIds?: string[]
    ): Promise<any[]> {
        const allTransactions: any[] = [];
        let offset = 0;
        const count = 500; // Use maximum count to minimize API calls
        let hasMore = true;
        let retryCount = 0;
        const maxRetries = 2;
        let totalExpected = 0;
        let batchCount = 0;

        console.log(`Starting paginated transaction fetch for date range: ${startDate} to ${endDate}`);
        if (accountIds && accountIds.length > 0) {
            console.log(`Fetching for specific accounts: ${accountIds.join(', ')}`);
        }

        while (hasMore && retryCount < maxRetries) {
            try {
                batchCount++;
                console.log(`Fetching transactions batch #${batchCount}: offset=${offset}, count=${count}`);

                const response = await plaidClient.transactionsGet({
                    access_token: accessToken,
                    start_date: startDate,
                    end_date: endDate,
                    options: {
                        include_personal_finance_category: true,
                        account_ids: accountIds,
                        count,
                        offset,
                    },
                });

                const transactions = response.data.transactions;
                const totalTransactions = response.data.total_transactions;

                // Set total expected on first batch
                if (batchCount === 1) {
                    totalExpected = totalTransactions;
                    console.log(`Total transactions available: ${totalExpected}`);
                }

                console.log(`Received ${transactions.length} transactions (total: ${totalTransactions}, offset: ${offset}, progress: ${allTransactions.length + transactions.length}/${totalExpected})`);

                // Add transactions to our collection
                allTransactions.push(...transactions);

                // Check if we've received all transactions
                if (transactions.length === 0 || allTransactions.length >= totalTransactions) {
                    hasMore = false;
                    console.log(`Completed transaction fetch. Total fetched: ${allTransactions.length}/${totalExpected} in ${batchCount} batches`);
                } else {
                    // Move to next batch
                    offset += count;

                    // Safety check to prevent infinite loops
                    if (offset > 10000) {
                        console.warn('Reached maximum offset limit (10,000), stopping pagination');
                        hasMore = false;
                    }
                }

                // Reset retry count on successful request
                retryCount = 0;

                // Add a small delay to be respectful to Plaid's API
                if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

            } catch (error) {
                retryCount++;
                console.error(`Error fetching transactions batch #${batchCount} (attempt ${retryCount}/${maxRetries}):`, error);

                // Enhanced error logging for Plaid API errors
                if (error && typeof error === 'object' && 'response' in error) {
                    const plaidError = error as any;
                    console.error('Plaid API Error Details:', {
                        status: plaidError.response?.status,
                        statusText: plaidError.response?.statusText,
                        data: plaidError.response?.data,
                        headers: plaidError.response?.headers,
                    });
                }

                if (retryCount >= maxRetries) {
                    console.error('Max retries reached, stopping pagination');
                    throw new Error(`Failed to fetch transactions after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log(`Successfully fetched ${allTransactions.length} total transactions in ${batchCount} batches`);
        return allTransactions;
    }

    /**
     * Builds where clause for database queries
     */
    private static buildWhereClause(filters: TransactionFilters) {
        const where: any = {};

        if (filters.accountId) {
            where.accountId = filters.accountId;
        }

        if (filters.startDate) {
            where.date = { ...where.date, gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
            where.date = { ...where.date, lte: new Date(filters.endDate) };
        }

        if (filters.category && filters.category !== 'all') {
            where.category = filters.category;
        }

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { merchantName: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        if (filters.status && filters.status !== 'all') {
            where.pending = filters.status === 'pending';
        }

        return where;
    }

    /**
     * Builds order by clause for database queries
     */
    private static buildOrderBy(filters: TransactionFilters) {
        let orderBy: any = {};

        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'date':
                    orderBy.date = filters.sortOrder || 'desc';
                    break;
                case 'amount':
                    orderBy.amount = filters.sortOrder || 'desc';
                    break;
                case 'name':
                    orderBy.name = filters.sortOrder || 'asc';
                    break;
                default:
                    orderBy.date = 'desc';
            }
        } else {
            orderBy.date = 'desc';
        }

        return orderBy;
    }

    /**
     * Gets all unique categories from transactions with optional filtering
     * Excludes credit card payments from spending calculations
     */
    static async getCategories(filters: { accountId?: string; startDate?: string; endDate?: string } = {}) {
        try {
            const whereClause: any = {};

            // Add account filter if specified
            if (filters.accountId) {
                whereClause.accountId = filters.accountId;
            }

            // Add date range filters if specified
            if (filters.startDate || filters.endDate) {
                whereClause.date = {};
                if (filters.startDate) {
                    whereClause.date.gte = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    whereClause.date.lte = new Date(filters.endDate);
                }
            }

            // Get all transactions to filter out credit card payments
            const allCategoryTransactionsRaw = await prisma.plaidTransaction.findMany({
                where: whereClause,
                select: {
                    id: true,
                    amount: true,
                    name: true,
                    merchantName: true,
                    category: true,
                },
            });
            const allCategoryTransactions = allCategoryTransactionsRaw.map(t => ({
                ...t,
                amount: Number(t.amount),
            }));
            // Filter out credit card payments (partial)
            const filteredTransactions = filterOutCreditCardPaymentsPartial(allCategoryTransactions);

            // Group by category and calculate statistics
            const categoryMap = new Map<string, { count: number; totalAmount: number }>();

            filteredTransactions.forEach(transaction => {
                if (transaction.amount > 0) { // Only count expenses
                    const category = transaction.category || 'Uncategorized';
                    const current = categoryMap.get(category) || { count: 0, totalAmount: 0 };

                    categoryMap.set(category, {
                        count: current.count + 1,
                        totalAmount: current.totalAmount + Math.abs(Number(transaction.amount))
                    });
                }
            });

            // Transform the results into the expected format
            const categories = Array.from(categoryMap.entries()).map(([category, stats]) => ({
                category,
                count: stats.count,
                totalAmount: stats.totalAmount,
                averageAmount: stats.count > 0 ? stats.totalAmount / stats.count : 0,
            }));

            // Sort by total amount descending
            categories.sort((a, b) => b.totalAmount - a.totalAmount);

            return categories;
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }

    /**
     * Syncs transactions for all active accounts
     */
    static async syncTransactions() {
        try {
            console.log('Starting transaction sync...');

            const accounts = await prisma.plaidAccount.findMany();

            for (const account of accounts) {
                await this.syncAccountTransactions(account);
            }

            console.log('Transaction sync completed');
        } catch (error) {
            console.error('Error syncing transactions:', error);
            throw error;
        }
    }

    /**
     * Syncs transactions for a single account
     */
    private static async syncAccountTransactions(account: any) {
        try {
            // Get the last transaction date for this account
            const lastTransaction = await prisma.plaidTransaction.findFirst({
                where: {
                    accountId: account.id,
                },
                orderBy: {
                    date: 'desc',
                },
            });

            const startDate = lastTransaction
                ? lastTransaction.date.toISOString().split('T')[0]
                : getCurrentYearRange().startDate; // Use start of current year for new accounts

            const endDate = new Date().toISOString().split('T')[0];

            // Fetch all transactions from Plaid using pagination
            const transactions = await this.fetchAllTransactions(
                account.accessToken,
                startDate,
                endDate,
                [account.plaidAccountId]
            );

            // Save new transactions to database
            for (const transaction of transactions) {
                await prisma.plaidTransaction.upsert({
                    where: {
                        plaidTransactionId: transaction.transaction_id,
                    },
                    update: {
                        amount: transaction.amount,
                        name: transaction.name,
                        merchantName: transaction.merchant_name,
                        category: transaction.personal_finance_category?.primary || "Uncategorized",
                        categoryIcon: transaction.personal_finance_category_icon_url || "",
                        pending: transaction.pending,
                        paymentChannel: transaction.payment_channel,
                        transactionType: transaction.payment_channel,
                        updatedAt: new Date(),
                    },
                    create: {
                        plaidTransactionId: transaction.transaction_id,
                        accountId: account.id,
                        amount: transaction.amount,
                        date: new Date(transaction.date),
                        name: transaction.name,
                        merchantName: transaction.merchant_name,
                        category: transaction.personal_finance_category?.primary || "Uncategorized",
                        categoryIcon: transaction.personal_finance_category_icon_url || "",
                        pending: transaction.pending,
                        paymentChannel: transaction.payment_channel,
                        transactionType: transaction.payment_channel,
                    },
                });
            }

            console.log(`Synced ${transactions.length} transactions for account ${account.name}`);
        } catch (error) {
            console.error(`Error syncing transactions for account ${account.name}:`, error);
        }
    }

    /**
     * Handles Plaid webhooks
     */
    static async handleWebhook(webhookData: any) {
        try {
            console.log('Processing webhook:', webhookData);

            if (webhookData.webhook_type === 'TRANSACTIONS') {
                if (webhookData.webhook_code === 'INITIAL_UPDATE' ||
                    webhookData.webhook_code === 'HISTORICAL_UPDATE' ||
                    webhookData.webhook_code === 'DEFAULT_UPDATE') {

                    // Trigger transaction sync
                    await this.syncTransactions();
                }
            }

            return { message: 'Webhook processed successfully' };
        } catch (error) {
            console.error('Error handling webhook:', error);
            throw error;
        }
    }

    /**
     * Unlinks an account and deletes all associated transactional data
     */
    static async unlinkAccount(accountId: string) {
        try {
            console.log(`Starting unlink process for account: ${accountId}`);

            // Validate account ID format
            if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
                throw new Error('Invalid account ID provided');
            }

            // First, verify the account exists
            const account = await prisma.plaidAccount.findUnique({
                where: { id: accountId },
                include: {
                    transactions: true,
                },
            });

            if (!account) {
                throw new Error('Account not found');
            }

            console.log(`Found account: ${account.name} with ${account.transactions.length} transactions`);

            // Use a transaction to ensure data consistency
            const result = await prisma.$transaction(async (tx) => {
                // Delete all transactions associated with this account
                const deleteTransactionsResult = await tx.plaidTransaction.deleteMany({
                    where: { accountId: accountId },
                });

                console.log(`Deleted ${deleteTransactionsResult.count} transactions for account ${account.name}`);

                // Delete the account itself
                const deletedAccount = await tx.plaidAccount.delete({
                    where: { id: accountId },
                });

                console.log(`Successfully unlinked account: ${deletedAccount.name}`);

                // Check if this was the last account for this link token
                const remainingAccounts = await tx.plaidAccount.findMany({
                    where: { linkTokenId: account.linkTokenId },
                });

                // If no accounts remain for this link token, clean up the link token
                if (remainingAccounts.length === 0) {
                    await tx.plaidLinkToken.delete({
                        where: { id: account.linkTokenId },
                    });
                    console.log(`Cleaned up orphaned link token: ${account.linkTokenId}`);
                }

                return {
                    success: true,
                    message: `Successfully unlinked account: ${deletedAccount.name}`,
                    deletedTransactions: deleteTransactionsResult.count,
                    accountName: deletedAccount.name,
                };
            });

            return result;
        } catch (error) {
            console.error('Error unlinking account:', error);
            throw error;
        }
    }

    /**
     * Unlinks multiple accounts by their IDs
     */
    static async unlinkAccounts(accountIds: string[]) {
        try {
            console.log(`Starting bulk unlink process for ${accountIds.length} accounts`);

            // Validate input
            if (!Array.isArray(accountIds) || accountIds.length === 0) {
                throw new Error('Invalid account IDs array provided');
            }

            // Filter out invalid account IDs
            const validAccountIds = accountIds.filter(id =>
                id && typeof id === 'string' && id.trim() !== ''
            );

            if (validAccountIds.length === 0) {
                throw new Error('No valid account IDs provided');
            }

            if (validAccountIds.length !== accountIds.length) {
                console.warn(`Filtered out ${accountIds.length - validAccountIds.length} invalid account IDs`);
            }

            const results = [];
            const errors = [];

            for (const accountId of validAccountIds) {
                try {
                    const result = await this.unlinkAccount(accountId);
                    results.push(result);
                } catch (error) {
                    console.error(`Failed to unlink account ${accountId}:`, error);
                    errors.push({ accountId, error: error instanceof Error ? error.message : 'Unknown error' });
                }
            }

            return {
                success: errors.length === 0,
                results,
                errors,
                totalProcessed: validAccountIds.length,
                successful: results.length,
                failed: errors.length,
            };
        } catch (error) {
            console.error('Error in bulk unlink process:', error);
            throw error;
        }
    }
} 