
import express from "express";
import { createExpense } from "../controllers/expense";

const router = express.Router()

router.post("/", createExpense)

export default router