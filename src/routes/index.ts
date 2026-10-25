import { Router } from "express";
import { d365Router } from "./d365.routes.js";
import { deepwikiRouter } from "./deepwiki.routes.js";
import { githubRouter } from "./github.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(deepwikiRouter);
apiRouter.use(githubRouter);
apiRouter.use("/d365", d365Router);
