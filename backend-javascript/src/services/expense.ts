import { CategoryType, Expense, Prisma } from "@prisma/client";
import prisma from "../prismaClient";
import CategoryService from "./category";

class ExpenseService {
  static create = async (input: {
    merchant: string;
    amount: Prisma.Decimal | number;
    comments?: string;
    date?: string;
    currency?: string;
    category: CategoryType;
    tagNames?: string[];
  }) => {
    const category = await CategoryService.getByTitle(input.category);
    if (!category) {
      throw new Error(`Category not found: ${input.category}`);
    }
    return prisma.expense.create({
      data: {
        merchant: input.merchant,
        amount: new Prisma.Decimal(input.amount),
        comments: input.comments,
        date: input.date ? new Date(input.date) : undefined,
        currency: input.currency,
        category: { connect: { id: category.id } },
        tags: input.tagNames
          ? { connect: input.tagNames.map((name) => ({ name })) }
          : undefined,
      },
    });
  };

  static getAll = async (
    categoryId: string,
    tags: string[],
    merchant: string,
    dateFrom: string,
    dateTo: string,
    amountFrom: string,
    amountTo: string
  ) => {
    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (tags && tags.length > 0) {
      where.tags = { some: { name: { in: tags } } };
    }
    if (merchant) {
      where.merchant = merchant;
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (amountFrom || amountTo) {
      where.amount = {};
      if (amountFrom) where.amount.gte = new Prisma.Decimal(amountFrom);
      if (amountTo) where.amount.lte = new Prisma.Decimal(amountTo);
    }
    where.deletedAt = null;
    return prisma.expense.findMany({
      where,
      orderBy: { date: "asc" },
    });
  };
}

export default ExpenseService;
