import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, cleanJsonResponse } from "./types.ts";
import { AIProvider } from "../providers/types.ts";
import { generateUpdatePrompt } from "../prompts/index.ts";

export interface UpdateLessonFieldArgs {
  message: string;
  fieldLabels: Record<string, string>;
  currentValues: Record<string, string>; // Made non-optional
  rephrase?: boolean;
}

export class UpdateHandler implements ToolHandler<UpdateLessonFieldArgs> {
  constructor(private provider: AIProvider) {}

  isValidArgs(args: unknown): args is UpdateLessonFieldArgs {
    if (!args || typeof args !== 'object') {
      console.error('Validation', 'args is not an object', args);
      return false;
    }

    const a = args as Partial<UpdateLessonFieldArgs>;
    
    if (typeof a.message !== 'string' || !a.message.trim()) {
      console.error('Validation', 'invalid message', a.message);
      return false;
    }

    if (!a.fieldLabels || typeof a.fieldLabels !== 'object' || Array.isArray(a.fieldLabels)) {
      console.error('Validation', 'invalid fieldLabels', a.fieldLabels);
      return false;
    }

    if (!a.currentValues || typeof a.currentValues !== 'object' || Array.isArray(a.currentValues)) {
      console.error('Validation', 'invalid currentValues', a.currentValues);
      return false;
    }

    if (a.rephrase !== undefined && typeof a.rephrase !== 'boolean') {
      console.error('Validation', 'invalid rephrase flag', a.rephrase);
      return false;
    }

    return true;
  }

  async execute(args: UpdateLessonFieldArgs) {
    try {
      const prompt = generateUpdatePrompt(args);
      const response = await this.provider.generateCompletion(prompt);
      const cleanedResponse = cleanJsonResponse(response);
      
      return {
        content: [{ type: "text", text: cleanedResponse }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : "Failed to process update request"
      );
    }
  }
}