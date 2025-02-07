import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler } from "./types.ts";
import { AIProvider } from "../providers/types.ts";
import { generateSuggestionPrompt } from "../prompts/index.ts";

export interface GenerateSuggestionArgs {
  context: string;
  type: 'topic' | 'content' | 'goals' | 'duration' | 'activity';
  currentValue: string;
  message?: string;
}

export class SuggestionHandler implements ToolHandler<GenerateSuggestionArgs> {
  constructor(private provider: AIProvider) {}

  isValidArgs(args: unknown): args is GenerateSuggestionArgs {
    if (!args || typeof args !== "object") return false;
    const a = args as Partial<GenerateSuggestionArgs>;
    return (
      typeof a.context === "string" &&
      typeof a.currentValue === "string" &&
      typeof a.type === "string" &&
      ["topic", "content", "goals", "duration", "activity"].includes(a.type) &&
      (a.message === undefined || typeof a.message === "string")
    );
  }

  async execute(args: GenerateSuggestionArgs) {
    try {
      const prompt = generateSuggestionPrompt(args);
      const suggestion = await this.provider.generateCompletion(prompt);
      
      return {
        content: [{ type: "text", text: suggestion }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : "Failed to process suggestion request"
      );
    }
  }
}