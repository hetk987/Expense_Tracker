import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { getUserId } from '@/lib/clerkHelpers';

export async function POST(
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

        const { id: alertId } = await params;
        const success = await BudgetService.markAlertAsRead(alertId, userId);

        if (!success) {
            return NextResponse.json(
                { error: 'Alert not found or already marked as read' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking alert as read:', error);
        return NextResponse.json(
            { error: 'Failed to mark alert as read' },
            { status: 500 }
        );
    }
}

