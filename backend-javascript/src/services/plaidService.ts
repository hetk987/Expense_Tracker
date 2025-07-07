import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export class PlaidService {
    /**
     * Creates a link token for Plaid Link integration
     * This token is used by the frontend to initialize Plaid Link
     * @returns Promise<string> - The link token string
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
     * The access token is used to make API calls to Plaid on behalf of the user
     * @param publicToken - The public token received from Plaid Link
     * @returns Promise<string> - The access token string
     */
    static async exchangePublicToken(publicToken: string): Promise<string> {
        try {
            const response = await plaidClient.itemPublicTokenExchange({
                public_token: publicToken,
            });

            return response.data.access_token;
        } catch (error) {
            console.error('Error exchanging public token:', error);
            throw error;
        }
    }

    /**
     * Fetches all accounts associated with an access token
     * @param accessToken - The Plaid access token for the user
     * @returns Promise containing array of account objects
     */
    static async getAccounts(accessToken: string) {
        try {
            const response = await plaidClient.accountsGet({
                access_token: accessToken,
            });

            return response.data.accounts;
        } catch (error) {
            console.error('Error getting accounts:', error);
            throw error;
        }
    }

    /**
     * Fetches transactions for a given access token and date range
     * @param accessToken - The Plaid access token for the user
     * @param startDate - Start date in YYYY-MM-DD format
     * @param endDate - End date in YYYY-MM-DD format
     * @returns Promise containing array of transaction objects
     */
    static async getTransactions(accessToken: string, startDate: string, endDate: string) {
        try {
            const response = await plaidClient.transactionsGet({
                access_token: accessToken,
                start_date: startDate,
                end_date: endDate,
                options: {
                    include_personal_finance_category: true,
                },
            });

            return response.data.transactions;
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    /**
     * Syncs transactions for all active accounts
     * This method is called by the scheduler and webhook handlers
     * It fetches new transactions and stores them in the database
     */
    static async syncTransactions() {
        try {
            console.log('Starting transaction sync...');

            // Get all link tokens that haven't expired
            const activeLinkTokens = await prisma.plaidLinkToken.findMany({
                where: {
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                include: {
                    accounts: true,
                },
            });

            for (const linkToken of activeLinkTokens) {
                // For each account, fetch new transactions
                for (const account of linkToken.accounts) {
                    await this.syncAccountTransactions(account);
                }
            }

            console.log('Transaction sync completed');
        } catch (error) {
            console.error('Error syncing transactions:', error);
            throw error;
        }
    }

    /**
     * Syncs transactions for a single account
     * This is a private helper method used by syncTransactions()
     * @param account - The account object containing account details and access token
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
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

            const endDate = new Date().toISOString().split('T')[0];

            // Fetch transactions from Plaid
            const transactions = await this.getTransactions(
                account.accessToken, // You'll need to store access tokens
                startDate,
                endDate
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
                        category: transaction.category || [],
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
                        category: transaction.category || [],
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
} 