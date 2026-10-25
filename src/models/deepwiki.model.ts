import { z } from "zod";

// "owner/repo", e.g. "facebook/react"
export const repoNameSchema = z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'repo must look like "owner/repo"');

export const deepwikiChatSchema = z.object({
  repo: repoNameSchema,
  question: z.string().min(1).max(2000),
});

export type DeepwikiChatInput = z.infer<typeof deepwikiChatSchema>;
