import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        const filters = {
            accountId: accountId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            category: category || undefined,
            search: search || undefined,
            status: status || undefined,
        };

        const stats = await PlaidService.getTransactionStats(filters);
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error getting transaction stats:', error);
        return NextResponse.json(
            { error: 'Failed to get transaction stats' },
            { status: 500 }
        );
    }
} 