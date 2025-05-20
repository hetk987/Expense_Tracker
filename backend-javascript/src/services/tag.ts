import prisma from "../prismaClient";

export default class TagService {
    static async getAll() {
        return prisma.tag.findMany({})
    }
}