import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler } from "./types.ts";
import { AIProvider } from "../providers/types.ts";
import { generateSuggestionPrompt } from "../prompts/index.ts";
import { mapPositionToEnglish} from "../utils/mappings.ts";

export interface GenerateSuggestionArgs {
  context: string;
  type: 'topic' | 'content' | 'goals' | 'duration' | 'activity' | 'position' | 'contentGoals' | 'skillGoals' | 'priorKnowledge' | 'gradeLevel';
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
      ["topic", "content", "goals", "duration", "activity", "position", "contentGoals", "skillGoals", "priorKnowledge", "gradeLevel"].includes(a.type) &&
      (a.message === undefined || typeof a.message === "string")
    );
  }

  async execute(args: GenerateSuggestionArgs) {
    try {
      const prompt = generateSuggestionPrompt(args);
      const suggestion = await this.provider.generateCompletion(prompt);
      
      let mappedSuggestion = suggestion;
      
      // Map the Hebrew values to English for specific field types
      if (args.type === 'position') {
        mappedSuggestion = mapPositionToEnglish(suggestion.trim());
      }

      return {
        content: [{ type: "text", text: mappedSuggestion }]
      };
    } catch (error) {
      let hebrewError = "מצטער, נתקלנו בבעיה. אנא נסה שוב מאוחר יותר.";
      
      if (error instanceof Error) {
        if (error.message.includes("Resource has been exhausted") || 
            error.message.includes("quota")) {
          hebrewError = "המערכת עמוסה כרגע. אנא נסה שוב בעוד מספר דקות.";
        } else if (error.message.includes("Invalid")) {
          hebrewError = "נראה שיש בעיה בבקשה. אנא בדוק את הפרטים ונסה שוב.";
        }
      }
      
      const originalError = error instanceof Error ? error.message : "Unknown error";
      
      throw new McpError(
        ErrorCode.InternalError,
        JSON.stringify({
          message: hebrewError,
          originalError: originalError
        })
      );
    }
  }
}
