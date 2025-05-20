import { CategoryType, Expense, Prisma } from "@prisma/client";
import prisma from "../prismaClient";
import CategoryService from "./category";

export const create = async (input: {
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
                ? { connect: input.tagNames.map(name => ({ name })) }
                : undefined,
        },
    });
};