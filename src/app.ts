import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(express.json());
app.use(apiRouter);
app.use(errorHandler);
