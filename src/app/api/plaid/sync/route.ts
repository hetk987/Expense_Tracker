import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';
import { BudgetService } from '@/lib/budgetService';
import { getUserInfo } from '@/lib/clerkHelpers';

export async function POST(request: NextRequest) {
    try {
        await PlaidService.syncTransactions();
        
        // Automatically check for budget alerts after transaction sync
        // This ensures alerts are triggered when new transactions affect budgets
        try {
            // Get authenticated user info from Clerk
            const userInfo = await getUserInfo();
            
            if (userInfo) {
                await BudgetService.checkBudgetAlerts(userInfo.userId, userInfo.email, userInfo.name);
            } else {
                return NextResponse.json(
                    { error: 'Unauthorized - Please sign in' },
                    { status: 401 }
                );
            }
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