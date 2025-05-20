
import { Request, Response, NextFunction } from 'express';
import { CategoryType, Expense, Prisma } from '@prisma/client';
import * as expenseService from '../services/expense';
import CategoryService from '../services/category';

interface CreateExpenseDTO {
    merchant: string;
    amount: number;
    comments?: string;
    date?: string;
    currency?: string;
    category: CategoryType;
    tagNames?: string[];
}


export const createExpense = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const data = req.body as CreateExpenseDTO;
        const newExpense: Expense = await expenseService.create(data)
        res.json(newExpense)
    }
    catch (err) {
        next(err)
    }
}