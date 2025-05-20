import prisma from '../prismaClient.js';
import { CategoryType } from '@prisma/client';

class CategoryService {
    static async getAll() {
        return prisma.category.findMany({});
    }

    static async getById(id: string) {
        return prisma.category.findUnique({
            where: {
                id,
            },
        });
    }

    static async getByTitle(title: CategoryType) {
        return prisma.category.findUnique({
            where: {
                title,
            }
        })
    }
}

export default CategoryService