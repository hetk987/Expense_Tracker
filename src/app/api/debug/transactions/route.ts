import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';

async function getTransactionsHandler(request: NextRequest) {
    try {
        // Log debug access
        logDebugAccess(request, '/api/debug/transactions');

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build where clause
        const where: any = {};

        if (accountId) {
            where.accountId = accountId;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }

        // Get transactions with account information
        const transactions = await prisma.plaidTransaction.findMany({
            where,
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                        mask: true,
                        type: true,
                        plaidAccountId: true,
                        institutionId: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
            take: limit,
            skip: offset,
        });

        // Get total count for pagination
        const total = await prisma.plaidTransaction.count({ where });

        // Get summary statistics
        const summary = await prisma.plaidTransaction.aggregate({
            where,
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

        // Get transactions by category
        const categoryStats = await prisma.plaidTransaction.groupBy({
            by: ['category'],
            where,
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
            take: 10,
        });

        return NextResponse.json({
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
            summary: {
                totalTransactions: summary._count.id,
                totalAmount: summary._sum.amount,
                averageAmount: summary._avg.amount,
                minAmount: summary._min.amount,
                maxAmount: summary._max.amount,
                dateRange: {
                    earliest: summary._min.date,
                    latest: summary._max.date,
                },
            },
            topCategories: categoryStats.map(stat => ({
                category: stat.category,
                count: stat._count.id,
                totalAmount: stat._sum.amount,
            })),
            transactions: transactions.map(transaction => ({
                id: transaction.id,
                plaidTransactionId: transaction.plaidTransactionId,
                amount: transaction.amount,
                currency: transaction.currency,
                date: transaction.date,
                name: transaction.name,
                merchantName: transaction.merchantName,
                category: transaction.category,
                pending: transaction.pending,
                paymentChannel: transaction.paymentChannel,
                transactionType: transaction.transactionType,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                account: transaction.account,
            })),
            debug: {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
                queryParams: {
                    limit,
                    offset,
                    accountId,
                    startDate,
                    endDate,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}

export const GET = debugProtected(getTransactionsHandler); 