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

        const alerts = await BudgetService.checkBudgetAlerts(userInfo.userId, email, name);

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
        // Get authenticated user info from Clerk
        const userInfo = await getUserInfo();
        
        if (!userInfo) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const alerts = await BudgetService.checkBudgetAlerts(userInfo.userId, userInfo.email, userInfo.name);

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

