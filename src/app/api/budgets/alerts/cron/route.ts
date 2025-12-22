import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { clerkClient } from '@clerk/nextjs/server';
import { BudgetService } from '@/lib/budgetService';

/**
 * Cron endpoint to check budget alerts for all users.
 *
 * Intended to be called once daily by a scheduler (e.g. Vercel Cron).
 * Protects access using the CRON_SECRET environment variable.
 */
export async function POST(request: NextRequest) {
    try {
        // Allow secret via header or query param (Vercel Cron cannot set headers)
        const url = new URL(request.url);
        const secret =
            request.headers.get('x-cron-secret') ||
            url.searchParams.get('secret');

        if (!secret || secret !== process.env.CRON_SECRET) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // If a single user ID is provided (single-tenant), use it; otherwise find all distinct users with active budgets
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

                await BudgetService.checkBudgetAlerts(userId, email, name);
                sent++;
            } catch (error) {
                console.error('Cron alert error for user', userId, error);
                failed++;
            }
        }

        return NextResponse.json({
            success: true,
            processedUsers: userBudgets.length,
            alertsChecked: sent,
            failedUsers: failed,
        });
    } catch (error) {
        console.error('Cron alerts endpoint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


