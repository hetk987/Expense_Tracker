import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { CreateBudgetRequest } from '@/types';

// Temporary user ID until proper auth is implemented
const TEMP_USER_ID = 'temp-user-1';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const budgetType = searchParams.get('budgetType') || undefined;
        const isActive = searchParams.get('isActive') === 'true' ? true :
            searchParams.get('isActive') === 'false' ? false : undefined;

        const filters = { budgetType, isActive };
        const budgets = await BudgetService.getBudgets(TEMP_USER_ID, filters);

        return NextResponse.json(budgets);
    } catch (error) {
        console.error('Error getting budgets:', error);
        return NextResponse.json(
            { error: 'Failed to get budgets' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateBudgetRequest = await request.json();

        // Validate required fields
        if (!body.name || !body.budgetType || !body.amount || !body.period || !body.startDate) {
            return NextResponse.json(
                { error: 'Missing required fields: name, budgetType, amount, period, startDate' },
                { status: 400 }
            );
        }

        // Validate budget type specific fields
        if (body.budgetType === 'CATEGORY' && !body.targetValue) {
            return NextResponse.json(
                { error: 'targetValue is required for CATEGORY budgets' },
                { status: 400 }
            );
        }

        if (body.budgetType === 'MERCHANT' && !body.merchantName) {
            return NextResponse.json(
                { error: 'merchantName is required for MERCHANT budgets' },
                { status: 400 }
            );
        }

        if (body.budgetType === 'ACCOUNT' && !body.accountId) {
            return NextResponse.json(
                { error: 'accountId is required for ACCOUNT budgets' },
                { status: 400 }
            );
        }

        // Validate amount
        if (body.amount <= 0) {
            return NextResponse.json(
                { error: 'Budget amount must be greater than 0' },
                { status: 400 }
            );
        }

        // Validate dates
        const startDate = new Date(body.startDate);
        if (isNaN(startDate.getTime())) {
            return NextResponse.json(
                { error: 'Invalid start date' },
                { status: 400 }
            );
        }

        if (body.endDate) {
            const endDate = new Date(body.endDate);
            if (isNaN(endDate.getTime()) || endDate <= startDate) {
                return NextResponse.json(
                    { error: 'End date must be after start date' },
                    { status: 400 }
                );
            }
        }

        const budget = await BudgetService.createBudget(TEMP_USER_ID, body);
        return NextResponse.json(budget, { status: 201 });
    } catch (error) {
        console.error('Error creating budget:', error);
        return NextResponse.json(
            { error: 'Failed to create budget' },
            { status: 500 }
        );
    }
}

