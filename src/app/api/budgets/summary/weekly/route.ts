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

        const success = await BudgetService.sendWeeklySummary(TEMP_USER_ID, email, name);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to send weekly summary or no budgets found' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Weekly budget summary sent successfully'
        });
    } catch (error) {
        console.error('Error sending weekly summary:', error);
        return NextResponse.json(
            { error: 'Failed to send weekly summary' },
            { status: 500 }
        );
    }
}

// For manual trigger via GET request (useful for testing)
export async function GET(request: NextRequest) {
    try {
        const success = await BudgetService.sendWeeklySummary(TEMP_USER_ID, TEMP_USER_EMAIL, TEMP_USER_NAME);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to send weekly summary or no budgets found' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Weekly budget summary sent successfully'
        });
    } catch (error) {
        console.error('Error sending weekly summary:', error);
        return NextResponse.json(
            { error: 'Failed to send weekly summary' },
            { status: 500 }
        );
    }
}

