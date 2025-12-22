import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';
const TEMP_USER_EMAIL = 'user@example.com';
const TEMP_USER_NAME = 'User';

export async function POST(request: NextRequest) {
    try {
        await PlaidService.syncTransactions();
        
        // Automatically check for budget alerts after transaction sync
        // This ensures alerts are triggered when new transactions affect budgets
        try {
            await BudgetService.checkBudgetAlerts(TEMP_USER_ID, TEMP_USER_EMAIL, TEMP_USER_NAME);
        } catch (alertError) {
            // Log but don't fail the sync if alert check fails
            console.error('Error checking alerts after transaction sync:', alertError);
        }
        
        return NextResponse.json({ message: 'Transaction sync completed' });
    } catch (error) {
        console.error('Error syncing transactions:', error);
        return NextResponse.json(
            { error: 'Failed to sync transactions' },
            { status: 500 }
        );
    }
} 