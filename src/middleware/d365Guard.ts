import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function d365Guard(_req: Request, res: Response, next: NextFunction) {
  if (!env.D365_MCP_URL) {
    res.status(503).json({ error: "D365 is not configured. Set D365_MCP_URL in .env (see .env.example)." });
    return;
  }
  next();
}
