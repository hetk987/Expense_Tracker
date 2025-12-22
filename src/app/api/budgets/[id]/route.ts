import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { CreateBudgetRequest } from '@/types';
import { getUserId } from '@/lib/clerkHelpers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const { id: budgetId } = await params;
        const budget = await BudgetService.getBudgetById(budgetId, userId);

        if (!budget) {
            return NextResponse.json(
                { error: 'Budget not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(budget);
    } catch (error) {
        console.error('Error getting budget:', error);
        return NextResponse.json(
            { error: 'Failed to get budget' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: budgetId } = await params;
        const updates: Partial<CreateBudgetRequest> = await request.json();

        // Validate amount if provided
        if (updates.amount !== undefined && updates.amount <= 0) {
            return NextResponse.json(
                { error: 'Budget amount must be greater than 0' },
                { status: 400 }
            );
        }

        // Validate dates if provided
        if (updates.startDate) {
            const startDate = new Date(updates.startDate);
            if (isNaN(startDate.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid start date' },
                    { status: 400 }
                );
            }
        }

        if (updates.endDate) {
            const endDate = new Date(updates.endDate);
            if (isNaN(endDate.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid end date' },
                    { status: 400 }
                );
            }

            if (updates.startDate) {
                const startDate = new Date(updates.startDate);
                if (endDate <= startDate) {
                    return NextResponse.json(
                        { error: 'End date must be after start date' },
                        { status: 400 }
                    );
                }
            }
        }

        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const budget = await BudgetService.updateBudget(budgetId, userId, updates);

        if (!budget) {
            return NextResponse.json(
                { error: 'Budget not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(budget);
    } catch (error) {
        console.error('Error updating budget:', error);
        return NextResponse.json(
            { error: 'Failed to update budget' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const { id: budgetId } = await params;
        const alerts = await BudgetService.deleteBudgetAlerts(budgetId);
        if (!alerts) {
            return NextResponse.json(
                { error: 'Failed to delete alerts' },
                { status: 500 }
            );
        }
        
        const success = await BudgetService.deleteBudget(budgetId, userId);

        if (!success) {
            return NextResponse.json(
                { error: 'Budget not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting budget:', error);
        return NextResponse.json(
            { error: 'Failed to delete budget' },
            { status: 500 }
        );
    }
}

