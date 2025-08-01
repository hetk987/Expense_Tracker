import { NextRequest, NextResponse } from 'next/server';
import { PlaidService } from '@/lib/plaidService';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const accountIds = searchParams.get('accountIds');

        if (!accountId && !accountIds) {
            return NextResponse.json(
                { error: 'Either accountId or accountIds parameter is required' },
                { status: 400 }
            );
        }

        let result;

        if (accountIds) {
            // Handle bulk unlink
            const ids = accountIds.split(',').map(id => id.trim());
            if (ids.length === 0) {
                return NextResponse.json(
                    { error: 'No valid account IDs provided' },
                    { status: 400 }
                );
            }
            result = await PlaidService.unlinkAccounts(ids);
        } else {
            // Handle single account unlink
            result = await PlaidService.unlinkAccount(accountId!);
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error unlinking account(s):', error);
        return NextResponse.json(
            {
                error: 'Failed to unlink account(s)',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 