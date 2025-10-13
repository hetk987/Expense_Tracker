import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { CreateBudgetRequest } from '@/types';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const budgetId = params.id;
        const budget = await BudgetService.getBudgetById(budgetId, TEMP_USER_ID);

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
    { params }: { params: { id: string } }
) {
    try {
        const budgetId = params.id;
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

        const budget = await BudgetService.updateBudget(budgetId, TEMP_USER_ID, updates);

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
    { params }: { params: { id: string } }
) {
    try {
        const budgetId = params.id;
        const success = await BudgetService.deleteBudget(budgetId, TEMP_USER_ID);

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

