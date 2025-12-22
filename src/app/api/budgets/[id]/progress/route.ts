import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { getUserId } from '@/lib/clerkHelpers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const { id: budgetId } = await params;
        const progress = await BudgetService.calculateBudgetProgress(budgetId, userId);

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

