import { Request, Response, NextFunction } from "express";
import { CategoryType, Expense, Prisma } from "@prisma/client";
import ExpenseService from "../services/expense";
import CategoryService from "../services/category";

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
    const newExpense: Expense = await ExpenseService.create(data);
    res.json(newExpense);
  } catch (err) {
    next(err);
  }
};

export const getExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, tags, merchant, dateFrom, dateTo, amountFrom, amountTo } =
      req.query;
    let categoryId;
    if (category) {
      categoryId = CategoryService.getByTitle(category as CategoryType);
    }
    let tagsArray: string[];
    if (typeof tags === "string") {
      tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    } else if (Array.isArray(tags)) {
      tagsArray = tags as string[];
    }
    const expense: Expense[] = await ExpenseService.getAll(
      category as string,
      tags as string[],
      merchant as string,
      dateFrom as string,
      dateTo as string,
      amountFrom as string,
      amountTo as string
    );
    res.json(expense);
  } catch (err) {
    next(err);
  }
};
