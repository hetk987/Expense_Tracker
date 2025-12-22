import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { getUserId } from '@/lib/clerkHelpers';

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const progress = await BudgetService.getAllBudgetProgress(userId);
        return NextResponse.json(progress);
    } catch (error) {
        console.error('Error getting all budget progress:', error);
        return NextResponse.json(
            { error: 'Failed to get budget progress' },
            { status: 500 }
        );
    }
}

