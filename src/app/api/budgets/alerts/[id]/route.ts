import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) { 
    try {
        const { id: alertId } = await params;
        const success = await BudgetService.markAlertAsRead(alertId, TEMP_USER_ID);

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

