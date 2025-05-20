
import { Request, Response, NextFunction } from 'express';
import { Expense, Prisma } from '@prisma/client';
import * as expenseService from '../services/expense';

interface CreateExpenseDTO {
    merchant: string;
    amount: number;
    comments?: string;
    date?: string;
    currency?: string;
    categoryId: string;
    tagNames?: string[];
}


export const createExpense = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        console.log('req.body =', req.body);
        const data = req.body as CreateExpenseDTO;
        const newExpense: Expense = await expenseService.create(data)
        res.json(newExpense)
    }
    catch (err) {
        next(err)
    }
}