import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';
const TEMP_USER_EMAIL = 'user@example.com';
const TEMP_USER_NAME = 'Test User';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userEmail, userName } = body;

        // Use provided email/name or fall back to temp values
        const email = userEmail || TEMP_USER_EMAIL;
        const name = userName || TEMP_USER_NAME;

        const alerts = await BudgetService.checkBudgetAlerts(TEMP_USER_ID, email, name);

        return NextResponse.json({
            success: true,
            alerts,
            message: `Checked budgets and created ${alerts.length} new alerts`
        });
    } catch (error) {
        console.error('Error checking budget alerts:', error);
        return NextResponse.json(
            { error: 'Failed to check budget alerts' },
            { status: 500 }
        );
    }
}

// For manual trigger via GET request (useful for testing)
export async function GET(request: NextRequest) {
    try {
        const alerts = await BudgetService.checkBudgetAlerts(TEMP_USER_ID, TEMP_USER_EMAIL, TEMP_USER_NAME);

        return NextResponse.json({
            success: true,
            alerts,
            message: `Checked budgets and created ${alerts.length} new alerts`
        });
    } catch (error) {
        console.error('Error checking budget alerts:', error);
        return NextResponse.json(
            { error: 'Failed to check budget alerts' },
            { status: 500 }
        );
    }
}

