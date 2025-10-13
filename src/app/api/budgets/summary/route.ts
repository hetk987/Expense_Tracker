import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function GET(request: NextRequest) {
    try {
        const summary = await BudgetService.getBudgetSummary(TEMP_USER_ID);
        return NextResponse.json(summary);
    } catch (error) {
        console.error('Error getting budget summary:', error);
        return NextResponse.json(
            { error: 'Failed to get budget summary' },
            { status: 500 }
        );
    }
}

