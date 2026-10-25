import type { Request, Response } from "express";
import { z } from "zod";
import { deepwikiChatSchema } from "../models/deepwiki.model.js";
import { DeepwikiService } from "../services/deepwiki.service.js";

export async function listDeepwikiTools(_req: Request, res: Response) {
  const tools = await DeepwikiService.listTools();
  res.json({ tools });
}

export async function chatDeepwiki(req: Request, res: Response) {
  const parsed = deepwikiChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: z.flattenError(parsed.error).fieldErrors });
    return;
  }

  const { repo, question } = parsed.data;
  const result = await DeepwikiService.askQuestion(repo, question);

  if (result.isError) {
    res.status(502).json({ error: "DeepWiki returned an error", details: result.text });
    return;
  }
  res.json({ repo, question, answer: result.text });
}

export async function getWikiStructure(req: Request, res: Response) {
  const repo = `${req.params.owner}/${req.params.repo}`;
  const result = await DeepwikiService.readStructure(repo);

  if (result.isError) {
    res.status(502).json({ error: "DeepWiki returned an error", details: result.text });
    return;
  }
  res.json({ repo, structure: result.text });
}
