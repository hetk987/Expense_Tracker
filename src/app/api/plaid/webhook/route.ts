import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';
import { BudgetService } from '@/lib/budgetService';
import { getUserInfo } from '@/lib/clerkHelpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await PlaidService.handleWebhook(body);
        
        // Automatically check for budget alerts after webhook transaction updates
        // This ensures alerts are triggered when new transactions come in via webhook
        try {
            // Get authenticated user info from Clerk
            const userInfo = await getUserInfo();
            
            if (userInfo) {
                await BudgetService.checkBudgetAlerts(userInfo.userId, userInfo.email, userInfo.name);
            } else {
                // Webhook might be called without auth context, skip email alerts
                console.log('No authenticated user found for webhook, skipping email alerts');
            }
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