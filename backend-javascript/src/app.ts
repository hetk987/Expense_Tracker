import express, { NextFunction, Request, Response } from "express";
import expenseRoutes from "./routes/expense";
import categoryRoutes from "./routes/category";
import tagRoutes from "./routes/tag";
const app = express();
const port = 3000;

function logger(req: Request, res: Response, next: NextFunction) {
  console.log(req.url)
  next()
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger)

app.get("/", (_req, res) => {
  res.send({ name: "Het Koradia" });
});

app.use("/expense", expenseRoutes);
app.use("/category", categoryRoutes);
app.use("/tag", tagRoutes)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
