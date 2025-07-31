import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function GET(request: NextRequest) {
    try {
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
        });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        );
    }
} 