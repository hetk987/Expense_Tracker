import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function GET(request: NextRequest) {
    try {
        const alerts = await BudgetService.getUnreadAlerts(TEMP_USER_ID);
        return NextResponse.json(alerts);
    } catch (error) {
        console.error('Error getting budget alerts:', error);
        return NextResponse.json(
            { error: 'Failed to get budget alerts' },
            { status: 500 }
        );
    }
}

