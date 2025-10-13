import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function GET(request: NextRequest) {
    try {
        const progress = await BudgetService.getAllBudgetProgress(TEMP_USER_ID);
        return NextResponse.json(progress);
    } catch (error) {
        console.error('Error getting all budget progress:', error);
        return NextResponse.json(
            { error: 'Failed to get budget progress' },
            { status: 500 }
        );
    }
}

