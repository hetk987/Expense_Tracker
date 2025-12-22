import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';
import { BudgetService } from '@/lib/budgetService';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';
const TEMP_USER_EMAIL = 'user@example.com';
const TEMP_USER_NAME = 'User';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await PlaidService.handleWebhook(body);
        
        // Automatically check for budget alerts after webhook transaction updates
        // This ensures alerts are triggered when new transactions come in via webhook
        try {
            await BudgetService.checkBudgetAlerts(TEMP_USER_ID, TEMP_USER_EMAIL, TEMP_USER_NAME);
        } catch (alertError) {
            // Log but don't fail the webhook processing if alert check fails
            console.error('Error checking alerts after webhook processing:', alertError);
        }
        
        return NextResponse.json({ message: 'Webhook processed successfully' });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 