import { Tag } from "@prisma/client"
import { NextFunction, Request, Response } from "express"
import TagService from "../services/tag"

export async function getAllTags(req: Request, res: Response, next: NextFunction) {
    try {
        const tags: Tag[] = await TagService.getAll()
        res.json(tags)
    }
    catch (err) {
        next(err)
    }
}