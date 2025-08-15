import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';
import { parseTransactionFilters } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = parseTransactionFilters(searchParams);

        const [transactionsData, categoriesData, accountsData] = await Promise.all([
            PlaidService.getTransactionsWithStats(filters),
            PlaidService.getCategories(filters),
            PlaidService.getAccounts()
        ]);

        return NextResponse.json({
            transactions: transactionsData.transactions,
            stats: transactionsData.stats,
            categories: categoriesData,
            accounts: accountsData,
            pagination: {
                total: transactionsData.stats.totalCount,
                limit: filters.limit || 50,
                offset: filters.offset || 0,
            }
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to get dashboard data' },
            { status: 500 }
        );
    }
} 