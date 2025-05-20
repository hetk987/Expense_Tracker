import { Request, Response, NextFunction } from 'express'
import CategoryService from '../services/category'
import { CategoryType } from '@prisma/client'


export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await CategoryService.getAll()
        res.json(categories)
    } catch (err) {
        next(err)
    }
}

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id: string = req.params.id
        const category = await CategoryService.getById(id)
        res.json(category)
    }
    catch (err) {
        next(err)
    }
}

export const getCategoryByTitle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const title = req.params.title as CategoryType
        const category = await CategoryService.getByTitle(title)
        res.json(category)
    }
    catch (err) {
        next(err)
    }
}