import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { clerkClient } from '@clerk/nextjs/server';
import { BudgetService } from '@/lib/budgetService';

/**
 * Cron endpoint to send weekly budget summaries for all users (or a single user if CRON_USER_ID is set).
 * Protect with CRON_SECRET. Accepts secret via x-cron-secret header or ?secret= query param.
 */
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const secret =
            request.headers.get('x-cron-secret') ||
            url.searchParams.get('secret');

        if (!secret || secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    } catch (error) {
        console.error('Cron weekly summary endpoint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}



