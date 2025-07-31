import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { plaidAccountId, name, mask, type, subtype, institutionId } = body;

        // Try to create a duplicate account with the same plaidAccountId
        const result = await prisma.plaidAccount.create({
            data: {
                plaidAccountId: plaidAccountId,
                name: name,
                mask: mask,
                type: type,
                subtype: subtype,
                institutionId: institutionId,
                linkTokenId: 'test-link-token-id',
                accessToken: 'test-access-token',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Account created successfully (constraint might not be working)',
            account: result,
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({
                success: false,
                message: 'Unique constraint working correctly - duplicate prevented',
                error: error.message,
            }, { status: 409 });
        }

        return NextResponse.json({
            success: false,
            message: 'Other error occurred',
            error: error.message,
        }, { status: 500 });
    }
} 