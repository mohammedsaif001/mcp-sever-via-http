import { Router } from "express";
import { getIndexedRepos } from "../controllers/github.controller.js";

export const githubRouter = Router();

githubRouter.get("/users/:username/indexed-repos", getIndexedRepos);
