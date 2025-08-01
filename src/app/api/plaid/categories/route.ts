import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const filters = {
            accountId: accountId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        };

        const categories = await PlaidService.getCategories(filters);
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error getting categories:', error);
        return NextResponse.json(
            { error: 'Failed to get categories' },
            { status: 500 }
        );
    }
}
