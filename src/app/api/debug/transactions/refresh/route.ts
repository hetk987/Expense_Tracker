import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';
import { PlaidService } from '@/lib/plaidService';
import { getCurrentYearRange } from '@/lib/utils';

async function refreshTransactionsHandler(request: NextRequest) {
    try {
        // Log debug access
        logDebugAccess(request, '/api/debug/transactions/refresh');

        const { searchParams } = new URL(request.url);
        const forceRefresh = searchParams.get('force') === 'true';
        const accountId = searchParams.get('accountId'); // Optional: refresh specific account only

        console.log('Starting transaction refresh...', {
            forceRefresh,
            accountId,
            timestamp: new Date().toISOString(),
        });

        // Get current year range - limit to last 2 years to avoid Plaid API limits
        const now = new Date();
        const thisYear = new Date(now.getFullYear(), 0, 1); // January 1st, 2 years ago
        const startDate = thisYear.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0]; // Today

        console.log('Date range for refresh:', { startDate, endDate });

        let accountsToRefresh;
        let deleteWhereClause: any = {};

        if (accountId) {
            // Refresh specific account
            const account = await prisma.plaidAccount.findUnique({
                where: { id: accountId },
            });

            if (!account) {
                return NextResponse.json(
                    { error: 'Account not found' },
                    { status: 404 }
                );
            }

            accountsToRefresh = [account];
            deleteWhereClause.accountId = accountId;
        } else {
            // Refresh all accounts
            accountsToRefresh = await prisma.plaidAccount.findMany();
        }

        if (accountsToRefresh.length === 0) {
            return NextResponse.json(
                { error: 'No accounts found to refresh' },
                { status: 404 }
            );
        }

        // Step 1: Delete existing transactions
        console.log(`Deleting existing transactions${accountId ? ` for account ${accountId}` : ' for all accounts'}...`);

        const deleteResult = await prisma.plaidTransaction.deleteMany({
            where: deleteWhereClause,
        });

        console.log(`Deleted ${deleteResult.count} existing transactions`);

        // Step 2: Re-sync transactions from start of year
        console.log('Starting transaction re-sync from start of year...');

        const syncResults = [];
        const errors = [];

        for (const account of accountsToRefresh) {
            try {
                console.log(`Syncing transactions for account: ${account.name} (${account.id})`);
                console.log(`Access token: ${account.accessToken ? 'Present' : 'Missing'}`);

                // Validate access token
                if (!account.accessToken) {
                    throw new Error('Access token is missing for this account');
                }

                // Fetch transactions from Plaid for this account from start of year
                const { Configuration, PlaidApi, PlaidEnvironments } = await import('plaid');

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

                console.log(`Making paginated Plaid API requests for account ${account.name}:`, {
                    start_date: startDate,
                    end_date: endDate,
                    access_token_length: account.accessToken.length,
                });

                // Use the new pagination method to fetch all transactions
                const transactions = await PlaidService.fetchAllTransactions(
                    account.accessToken,
                    startDate,
                    endDate,
                    [account.plaidAccountId] // Pass the specific account ID
                );

                console.log(`Fetched ${transactions.length} transactions from Plaid for account ${account.name}`);

                // Save transactions to database
                const savedTransactions = [];
                for (const transaction of transactions) {
                    try {
                        const savedTransaction = await prisma.plaidTransaction.create({
                            data: {
                                plaidTransactionId: transaction.transaction_id,
                                accountId: account.id,
                                amount: transaction.amount,
                                currency: transaction.iso_currency_code || 'USD',
                                date: new Date(transaction.date),
                                name: transaction.name,
                                merchantName: transaction.merchant_name,
                                category: transaction.personal_finance_category?.primary || "Uncategorized",
                                categoryIcon: transaction.personal_finance_category_icon_url || "Uncategorized",
                                pending: transaction.pending,
                                paymentChannel: transaction.payment_channel,
                                transactionType: transaction.payment_channel,
                            },
                        });
                        savedTransactions.push(savedTransaction);
                    } catch (dbError) {
                        console.error(`Error saving transaction ${transaction.transaction_id}:`, dbError);
                        // Continue with other transactions even if one fails
                    }
                }

                syncResults.push({
                    accountId: account.id,
                    accountName: account.name,
                    transactionsFetched: transactions.length,
                    transactionsSaved: savedTransactions.length,
                    dateRange: { startDate, endDate },
                });

                console.log(`Successfully synced ${savedTransactions.length} transactions for account ${account.name}`);

            } catch (error) {
                console.error(`Error syncing transactions for account ${account.name}:`, error);

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

                errors.push({
                    accountId: account.id,
                    accountName: account.name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    errorDetails: error && typeof error === 'object' && 'response' in error ? {
                        status: (error as any).response?.status,
                        data: (error as any).response?.data,
                    } : undefined,
                });
            }
        }

        // Step 3: Get summary statistics
        const totalTransactions = await prisma.plaidTransaction.count();
        const totalAmount = await prisma.plaidTransaction.aggregate({
            _sum: { amount: true },
        });

        const summary = await prisma.plaidTransaction.aggregate({
            _count: { id: true },
            _sum: { amount: true },
            _avg: { amount: true },
            _min: { amount: true, date: true },
            _max: { amount: true, date: true },
        });

        return NextResponse.json({
            success: true,
            message: 'Transaction refresh completed',
            summary: {
                totalTransactions: summary._count.id,
                totalAmount: summary._sum.amount,
                averageAmount: summary._avg.amount,
                minAmount: summary._min.amount,
                maxAmount: summary._max.amount,
                dateRange: {
                    earliest: summary._min.date,
                    latest: summary._max.date,
                },
            },
            refreshDetails: {
                accountsProcessed: accountsToRefresh.length,
                accountsRefreshed: syncResults.length,
                accountsWithErrors: errors.length,
                transactionsDeleted: deleteResult.count,
                dateRange: { startDate, endDate },
            },
            syncResults,
            errors: errors.length > 0 ? errors : undefined,
            debug: {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
                queryParams: {
                    forceRefresh,
                    accountId,
                },
            },
        });

    } catch (error) {
        console.error('Error refreshing transactions:', error);
        return NextResponse.json(
            {
                error: 'Failed to refresh transactions',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export const POST = debugProtected(refreshTransactionsHandler); 