import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';

async function testPlaidHandler(request: NextRequest) {
    try {
        // Log debug access
        logDebugAccess(request, '/api/debug/plaid-test');

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');

        console.log('Testing Plaid configuration...');

        // Test 1: Check environment variables
        const envCheck = {
            PLAID_CLIENT_ID: !!process.env.PLAID_CLIENT_ID,
            PLAID_SECRET: !!process.env.PLAID_SECRET,
            PLAID_ENV: process.env.PLAID_ENV,
            PLAID_WEBHOOK_URL: !!process.env.PLAID_WEBHOOK_URL,
        };

        console.log('Environment check:', envCheck);

        // Test 2: Check accounts in database
        const accounts = accountId
            ? await prisma.plaidAccount.findMany({ where: { id: accountId } })
            : await prisma.plaidAccount.findMany();

        console.log(`Found ${accounts.length} accounts in database`);

        const accountTests = [];

        for (const account of accounts) {
            const accountTest = {
                id: account.id,
                name: account.name,
                hasAccessToken: !!account.accessToken,
                accessTokenLength: account.accessToken?.length || 0,
                plaidAccountId: account.plaidAccountId,
                institutionId: account.institutionId,
            };

            // Test 3: Try to get account info from Plaid (if access token exists)
            if (account.accessToken) {
                try {
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

                    // Test accounts/get endpoint
                    const accountsResponse = await plaidClient.accountsGet({
                        access_token: account.accessToken,
                    });

                    accountTest.plaidTest = {
                        success: true,
                        accountsCount: accountsResponse.data.accounts.length,
                        itemId: accountsResponse.data.item?.item_id,
                    };

                    console.log(`Plaid test successful for account ${account.name}`);

                } catch (plaidError) {
                    console.error(`Plaid test failed for account ${account.name}:`, plaidError);

                    accountTest.plaidTest = {
                        success: false,
                        error: plaidError instanceof Error ? plaidError.message : 'Unknown error',
                        errorDetails: plaidError && typeof plaidError === 'object' && 'response' in plaidError ? {
                            status: (plaidError as any).response?.status,
                            data: (plaidError as any).response?.data,
                        } : undefined,
                    };
                }
            } else {
                accountTest.plaidTest = {
                    success: false,
                    error: 'No access token available',
                };
            }

            accountTests.push(accountTest);
        }

        return NextResponse.json({
            success: true,
            message: 'Plaid configuration test completed',
            environment: envCheck,
            accounts: accountTests,
            debug: {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
                queryParams: { accountId },
            },
        });

    } catch (error) {
        console.error('Error testing Plaid configuration:', error);
        return NextResponse.json(
            {
                error: 'Failed to test Plaid configuration',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export const GET = debugProtected(testPlaidHandler); 