import { deepwikiClient } from "../lib/mcpClient.js";

export class DeepwikiService {
  static async listTools() {
    const tools = await deepwikiClient.listTools();
    return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
  }

  static async askQuestion(repoName: string, question: string) {
    return deepwikiClient.callTool("ask_wiki_question", { repoName, question });
  }

  static async readStructure(repoName: string) {
    return deepwikiClient.callTool("read_wiki_structure", { repoName });
  }

  static async close() {
    await deepwikiClient.close();
  }
}
