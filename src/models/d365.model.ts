import { z } from "zod";

export interface ChatContext {
  channelId?: number;
}

export const d365ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().min(1).max(100).optional(),
  channelId: z.coerce.number().int().positive().optional(),
});

export type D365ChatInput = z.infer<typeof d365ChatSchema>;

export interface D365ToolCall {
  name: string;
  args: unknown;
}
