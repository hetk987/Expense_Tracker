import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { getUserInfo } from '@/lib/clerkHelpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { alertId, userEmail, userName } = body;

        if (!alertId) {
            return NextResponse.json(
                { error: 'Alert ID is required' },
                { status: 400 }
            );
        }

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

        // Resend the alert email
        const success = await BudgetService.resendAlertEmail(alertId, userInfo.userId, email, name);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to resend alert email. Alert may not exist or belong to you.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Alert email resent successfully to ${email}`
        });
    } catch (error) {
        console.error('Error resending alert email:', error);
        return NextResponse.json(
            { error: 'Failed to resend alert email' },
            { status: 500 }
        );
    }
}

