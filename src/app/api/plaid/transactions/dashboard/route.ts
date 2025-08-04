import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
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