import express from "express";
import { createExpense, getExpense } from "../controllers/expense";

const router = express.Router()

router.route("/")
    .get(getExpense)
    .post(createExpense)
    .delete(deleteExpense)


export default router