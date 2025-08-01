import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';

async function getTransactionStatusHandler(request: NextRequest) {
    try {
        // Log debug access
        logDebugAccess(request, '/api/debug/transactions/status');

        // Get basic transaction stats
        const totalTransactions = await prisma.plaidTransaction.count();
        const totalAccounts = await prisma.plaidAccount.count();

        // Get recent transactions
        const recentTransactions = await prisma.plaidTransaction.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: {
                account: {
                    select: {
                        name: true,
                        type: true,
                    }
                }
            }
        });

        // Get transaction date range
        const dateRange = await prisma.plaidTransaction.aggregate({
            _min: { date: true },
            _max: { date: true },
        });

        // Get category distribution
        const categoryStats = await prisma.plaidTransaction.groupBy({
            by: ['category'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });

        return NextResponse.json({
            status: 'ok',
            summary: {
                totalTransactions,
                totalAccounts,
                dateRange: {
                    earliest: dateRange._min.date,
                    latest: dateRange._max.date,
                },
            },
            recentTransactions: recentTransactions.map(t => ({
                id: t.id,
                name: t.name,
                amount: t.amount,
                date: t.date,
                category: t.category,
                accountName: t.account?.name,
                accountType: t.account?.type,
            })),
            topCategories: categoryStats.map(stat => ({
                category: stat.category,
                count: stat._count.id,
            })),
            debug: {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error getting transaction status:', error);
        return NextResponse.json(
            { error: 'Failed to get transaction status' },
            { status: 500 }
        );
    }
}

export const GET = debugProtected(getTransactionStatusHandler); 