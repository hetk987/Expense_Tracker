import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';

async function getTransactionStatsHandler(request: NextRequest) {
    try {
        // Log debug access
        logDebugAccess(request, '/api/debug/transactions/stats');

        // Get overall statistics
        const overallStats = await prisma.plaidTransaction.aggregate({
            _count: {
                id: true,
            },
            _sum: {
                amount: true,
            },
            _avg: {
                amount: true,
            },
            _min: {
                amount: true,
                date: true,
            },
            _max: {
                amount: true,
                date: true,
            },
        });

        // Get transactions by account
        const accountStats = await prisma.plaidTransaction.groupBy({
            by: ['accountId'],
            _count: {
                id: true,
            },
            _sum: {
                amount: true,
            },
            _avg: {
                amount: true,
            },
            orderBy: {
                _sum: {
                    amount: 'desc',
                },
            },
        });

        // Get account details for the stats
        const accountDetails = await prisma.plaidAccount.findMany({
            select: {
                id: true,
                name: true,
                mask: true,
                type: true,
                plaidAccountId: true,
            },
        });

        // Get transactions by category
        const categoryStats = await prisma.plaidTransaction.groupBy({
            by: ['category'],
            _count: {
                id: true,
            },
            _sum: {
                amount: true,
            },
            orderBy: {
                _sum: {
                    amount: 'desc',
                },
            },
            take: 20,
        });

        // Get transactions by month
        const monthlyStats = await prisma.$queryRaw`
            SELECT 
                DATE_TRUNC('month', date) as month,
                COUNT(*) as count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM "PlaidTransaction"
            GROUP BY DATE_TRUNC('month', date)
            ORDER BY month DESC
            LIMIT 12
        `;

        // Get pending vs completed transactions
        const statusStats = await prisma.plaidTransaction.groupBy({
            by: ['pending'],
            _count: {
                id: true,
            },
            _sum: {
                amount: true,
            },
        });

        // Get recent transactions (last 10)
        const recentTransactions = await prisma.plaidTransaction.findMany({
            include: {
                account: {
                    select: {
                        name: true,
                        mask: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
            take: 10,
        });

        return NextResponse.json({
            overall: {
                totalTransactions: overallStats._count.id,
                totalAmount: overallStats._sum.amount,
                averageAmount: overallStats._avg.amount,
                minAmount: overallStats._min.amount,
                maxAmount: overallStats._max.amount,
                dateRange: {
                    earliest: overallStats._min.date,
                    latest: overallStats._max.date,
                },
            },
            byAccount: accountStats.map(stat => {
                const account = accountDetails.find(a => a.id === stat.accountId);
                return {
                    accountId: stat.accountId,
                    accountName: account?.name || 'Unknown',
                    accountMask: account?.mask || 'Unknown',
                    accountType: account?.type || 'Unknown',
                    transactionCount: stat._count.id,
                    totalAmount: stat._sum.amount,
                    averageAmount: stat._avg.amount,
                };
            }),
            byCategory: categoryStats.map(stat => ({
                category: stat.category,
                count: stat._count.id,
                totalAmount: stat._sum.amount,
            })),
            byMonth: monthlyStats,
            byStatus: statusStats.map(stat => ({
                pending: stat.pending,
                count: stat._count.id,
                totalAmount: stat._sum.amount,
            })),
            recentTransactions: recentTransactions.map(t => ({
                id: t.id,
                name: t.name,
                amount: t.amount,
                date: t.date,
                pending: t.pending,
                category: t.category,
                accountName: t.account?.name,
                accountMask: t.account?.mask,
            })),
            debug: {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction stats' },
            { status: 500 }
        );
    }
}

export const GET = debugProtected(getTransactionStatsHandler); 