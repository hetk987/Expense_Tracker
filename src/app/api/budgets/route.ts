import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/budgetService';
import { CreateBudgetRequest } from '@/types';
import { getUserId, getUserInfo } from '@/lib/clerkHelpers';

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const budgetType = searchParams.get('budgetType') || undefined;
        const isActive = searchParams.get('isActive') === 'true' ? true :
            searchParams.get('isActive') === 'false' ? false : undefined;

        const filters = { budgetType, isActive };
        const budgets = await BudgetService.getBudgets(userId, filters);

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

        const userId = await getUserId();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const budget = await BudgetService.createBudget(userId, body);

        // Automatically check for alerts after budget creation
        try {
            const userInfo = await getUserInfo();
            if (userInfo) {
                await BudgetService.checkBudgetAlerts(userId, userInfo.email, userInfo.name);
            }
        } catch (alertError) {
            // Log but don't fail the budget creation if alert check fails
            console.error('Error checking alerts after budget creation:', alertError);
        }

        return NextResponse.json(budget, { status: 201 });
    } catch (error) {
        console.error('Error creating budget:', error);
        return NextResponse.json(
            { error: 'Failed to create budget' },
            { status: 500 }
        );
    }
}

