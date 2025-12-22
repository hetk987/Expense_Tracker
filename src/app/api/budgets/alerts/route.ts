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

        const alerts = await BudgetService.getUnreadAlerts(userId);
        return NextResponse.json(alerts);
    } catch (error) {
        console.error('Error getting budget alerts:', error);
        return NextResponse.json(
            { error: 'Failed to get budget alerts' },
            { status: 500 }
        );
    }
}

