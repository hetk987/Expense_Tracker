import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';
import { parseTransactionFilters } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = parseTransactionFilters(searchParams);

        const transactions = await PlaidService.getTransactions(filters);
        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error getting transactions:', error);
        return NextResponse.json(
            { error: 'Failed to get transactions' },
            { status: 500 }
        );
    }
} 