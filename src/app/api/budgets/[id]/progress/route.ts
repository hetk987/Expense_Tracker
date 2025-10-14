import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: budgetId } = await params;
        const progress = await BudgetService.calculateBudgetProgress(budgetId, TEMP_USER_ID);

        if (!progress) {
            return NextResponse.json(
                { error: 'Budget not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(progress);
    } catch (error) {
        console.error('Error getting budget progress:', error);
        return NextResponse.json(
            { error: 'Failed to get budget progress' },
            { status: 500 }
        );
    }
}

