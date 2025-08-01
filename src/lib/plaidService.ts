import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { prisma } from './prismaClient';
import { getCurrentYearRange } from './utils';

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

            if (filters.category) {
                where.category = {
                    has: filters.category,
                };
            }

            const transactions = await prisma.plaidTransaction.findMany({
                where,
                include: {
                    account: true,
                },
                orderBy: {
                    date: 'desc',
                },
                take: filters.limit || 100,
                skip: filters.offset || 0,
            });

            const total = await prisma.plaidTransaction.count({ where });

            return {
                transactions,
                total,
                hasMore: (filters.offset || 0) + (filters.limit || 100) < total,
            };
        } catch (error) {
            console.error('Error getting transactions:', error);
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

            // Fetch transactions from Plaid
            const response = await plaidClient.transactionsGet({
                access_token: account.accessToken,
                start_date: startDate,
                end_date: endDate,
                options: {
                    include_personal_finance_category: true,
                },
            });

            const transactions = response.data.transactions;

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
                        pending: transaction.pending,
                        paymentChannel: transaction.payment_channel,
                        transactionType: transaction.transaction_type,
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
                        pending: transaction.pending,
                        paymentChannel: transaction.payment_channel,
                        transactionType: transaction.transaction_type,
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