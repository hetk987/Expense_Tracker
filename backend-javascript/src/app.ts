import express, { NextFunction, Request, Response } from "express";
import dotenv from 'dotenv';
import plaidRoutes from "./routes/plaid";
import { SchedulerService } from "./services/schedulerService";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

function logger(req: Request, res: Response, next: NextFunction) {
  console.log(req.url);
  next();
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.get("/", (_req, res) => {
  res.send({ name: "Het Koradia" });
});

app.use("/plaid", plaidRoutes);

// Initialize scheduled jobs
SchedulerService.initScheduledJobs();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  SchedulerService.stopScheduledJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  SchedulerService.stopScheduledJobs();
  process.exit(0);
});
