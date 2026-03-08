import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { clerkClient } from '@clerk/nextjs/server';
import { BudgetService } from '@/lib/budgetService';
import { EmailService } from '@/lib/emailService';

/**
 * Cron endpoint to send weekly budget summaries for all users (or a single user if CRON_USER_ID is set).
 * Protect with CRON_SECRET. Accepts secret via x-cron-secret header or ?secret= query param.
 * Vercel Cron issues GET requests, but we also support POST for manual triggering.
 */
async function handleRequest(request: NextRequest) {
    const url = new URL(request.url);
    const secret =
        request.headers.get('x-cron-secret') ||
        url.searchParams.get('secret');

    if (!secret) {
        console.warn('Weekly budget summary cron invoked without secret.');
        return NextResponse.json(
            { error: 'Unauthorized - missing secret', reason: 'missing_secret' },
            { status: 401 }
        );
    }

    if (secret !== process.env.CRON_SECRET) {
        console.warn('Weekly budget summary cron invoked with invalid secret.');
        return NextResponse.json(
            { error: 'Unauthorized - invalid secret', reason: 'invalid_secret' },
            { status: 401 }
        );
    }

    // If email service is not configured, short-circuit with a clear response
    if (!EmailService.isConfigured()) {
        console.warn('Weekly budget summary cron: email service not configured (RESEND_API_KEY missing).');
        return NextResponse.json({
            success: false,
            message: 'Email service not configured. Set RESEND_API_KEY and related environment variables.',
            reason: 'email_not_configured',
            emailConfigured: false,
        });
    }

    const singleUserId = process.env.CRON_USER_ID;
    const userBudgets = singleUserId
        ? [{ userId: singleUserId }]
        : await prisma.budget.findMany({
            where: { isActive: true },
            select: { userId: true },
            distinct: ['userId'],
        });

    let sent = 0;
    let failed = 0;

    for (const { userId } of userBudgets) {
        try {
            const user = await (clerkClient as any).users.getUser(userId);

            const email =
                user.emailAddresses.find((e: { id: string }) => e.id === user.primaryEmailAddressId)?.emailAddress ||
                user.emailAddresses[0]?.emailAddress;

            const name =
                (user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName) ||
                user.username ||
                'User';

            if (!email) {
                console.warn(`Skipping user ${userId} - no email address`);
                failed++;
                continue;
            }

            const success = await BudgetService.sendWeeklySummary(userId, email, name);
            if (success) {
                sent++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('Cron weekly summary error for user', userId, error);
            failed++;
        }
    }

    return NextResponse.json({
        success: true,
        processedUsers: userBudgets.length,
        summariesSent: sent,
        failedUsers: failed,
    });
}

// Vercel Cron uses GET requests by default, but we also allow POST for flexibility.
export async function GET(request: NextRequest) {
    return handleRequest(request);
}

export async function POST(request: NextRequest) {
    return handleRequest(request);
}









