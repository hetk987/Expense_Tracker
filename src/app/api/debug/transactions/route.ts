import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';
import { filterOutCreditCardPayments, getCreditCardPayments } from '@/lib/chartUtils';
import { convertPrismaTransactions } from '@/lib/utils';

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
        const showCreditCardPayments = searchParams.get('showCreditCardPayments') === 'true';

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

        // Convert Prisma transactions to have number amounts
        const transactionsWithNumbers = convertPrismaTransactions(transactions);

        // Filter out credit card payments for spending calculations
        const filteredTransactions = filterOutCreditCardPayments(transactionsWithNumbers as any);
        const creditCardPayments = getCreditCardPayments(transactionsWithNumbers as any);

        // Calculate spending statistics excluding credit card payments
        const spendingTransactions = filteredTransactions.filter(t => t.amount < 0);
        const totalSpending = spendingTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const averageSpending = spendingTransactions.length > 0 ? totalSpending / spendingTransactions.length : 0;

        return NextResponse.json({
            total,
            summary: {
                ...summary,
                totalSpendingExcludingPayments: totalSpending,
                averageSpendingExcludingPayments: averageSpending,
                creditCardPaymentsCount: creditCardPayments.length,
                creditCardPaymentsTotal: creditCardPayments.reduce((sum, t) => sum + Number(t.amount), 0),
            },
            categoryStats: categoryStats.map(stat => ({
                category: stat.category,
                count: stat._count.id,
                totalAmount: Math.abs(Number(stat._sum.amount || 0)),
            })),
            transactions: showCreditCardPayments ? transactionsWithNumbers : filteredTransactions,
            creditCardPayments: showCreditCardPayments ? creditCardPayments : undefined,
            filters: {
                accountId,
                startDate,
                endDate,
                limit,
                offset,
                showCreditCardPayments,
            },
        });
    } catch (error) {
        console.error('Error in getTransactionsHandler:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}

export const GET = debugProtected(getTransactionsHandler); 