import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { getUserInfo } from '@/lib/clerkHelpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userEmail, userName } = body;

        // Get authenticated user info from Clerk
        const userInfo = await getUserInfo();
        
        if (!userInfo) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        // Use provided email/name for testing, or fall back to authenticated user info
        const email = userEmail || userInfo.email;
        const name = userName || userInfo.name;

        const success = await BudgetService.sendWeeklySummary(userInfo.userId, email, name);

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
        // Get authenticated user info from Clerk
        const userInfo = await getUserInfo();
        
        if (!userInfo) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const success = await BudgetService.sendWeeklySummary(userInfo.userId, userInfo.email, userInfo.name);

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

