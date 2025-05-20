import express from "express";
import { getAllCategories, getCategoryById, getCategoryByTitle } from "../controllers/category";


const router = express.Router()

router.get("/", getAllCategories)
router.get("/id/:id", getCategoryById)
router.get("/title/:title", getCategoryByTitle)


export default router