import { Router } from "express";
import { chatDeepwiki, getWikiStructure, listDeepwikiTools } from "../controllers/deepwiki.controller.js";

export const deepwikiRouter = Router();

deepwikiRouter.get("/tools", listDeepwikiTools);
deepwikiRouter.post("/chat", chatDeepwiki);
deepwikiRouter.get("/wiki/:owner/:repo/structure", getWikiStructure);
