import { Expense, Prisma } from "@prisma/client";
import prisma from "../prismaClient";

export const create = async (input: {
    merchant: string;
    amount: Prisma.Decimal | number;
    comments?: string;
    date?: string;
    currency?: string;
    categoryId: string;
    tagNames?: string[];
}) => {
    return prisma.expense.create({
        data: {
            merchant: input.merchant,
            amount: new Prisma.Decimal(input.amount),
            comments: input.comments,
            date: input.date ? new Date(input.date) : undefined,
            currency: input.currency,
            category: { connect: { id: input.categoryId } },
            tags: input.tagNames
                ? { connect: input.tagNames.map(name => ({ name })) }
                : undefined,
        },
    });
};