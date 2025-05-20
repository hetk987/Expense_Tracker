import express from "express";
import expenseRoutes from "./routes/expense";
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send({ name: "Het Koradia" });
});

app.use("/expense", expenseRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
