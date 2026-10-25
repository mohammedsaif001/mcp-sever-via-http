import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { d365ChatSchema } from "../models/d365.model.js";
import { D365Service } from "../services/d365.service.js";
import { isUnauthorized, unauthorizedMessage } from "../utils/errors.js";
import { parseJson } from "../utils/json.js";

export async function listD365Tools(_req: Request, res: Response) {
  const tools = await D365Service.listTools();
  res.json({ tools });
}

export async function callD365Tool(req: Request, res: Response) {
  const name = String(req.params.name);
  let execution;
  try {
    execution = await D365Service.callTool(name, req.body ?? {});
  } catch (err) {
    if (!isUnauthorized(err)) throw err;
    res.status(401).json({ error: unauthorizedMessage(name) });
    return;
  }

  if (execution.error === "not_found") {
    res.status(404).json({ error: `Unknown D365 tool "${name}"`, available: execution.available });
    return;
  }

  if (execution.error === "missing_args") {
    res.status(400).json({
      error: `Missing required arguments: ${execution.missing.join(", ")}`,
      inputSchema: execution.inputSchema,
    });
    return;
  }

  const { args, result } = execution;
  if (result.isError) {
    res.status(502).json({ error: "D365 returned an error", details: result.text });
    return;
  }
  res.json({ tool: name, args, result: parseJson(result.text) });
}

export async function chatD365(req: Request, res: Response) {
  if (!env.OPENAI_API_KEY) {
    res.status(503).json({ error: "OPENAI_API_KEY is not set. Add it to .env (see .env.example)." });
    return;
  }

  const parsed = d365ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: z.flattenError(parsed.error).fieldErrors });
    return;
  }

  const response = await D365Service.chat(parsed.data.message, parsed.data.sessionId, parsed.data.channelId);
  res.json(response);
}

export function endD365Chat(req: Request, res: Response) {
  const sessionId = String(req.params.sessionId);
  const deleted = D365Service.deleteSession(sessionId);
  res.status(deleted ? 204 : 404).end();
}
