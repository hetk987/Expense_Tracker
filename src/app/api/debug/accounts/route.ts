import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { debugProtected, logDebugAccess } from '@/lib/debugAuth';

async function getAccountsHandler(request: NextRequest) {
    try {
        // Log debug access
        logDebugAccess(request, '/api/debug/accounts');

        const accounts = await prisma.plaidAccount.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                plaidAccountId: true,
                name: true,
                mask: true,
                type: true,
                subtype: true,
                institutionId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            total: accounts.length,
            accounts: accounts,
            debug: {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        );
    }
}

export const GET = debugProtected(getAccountsHandler); 