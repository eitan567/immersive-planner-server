import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler } from "./types";
import { AIProvider } from "../providers/types";
import { generateSuggestionPrompt } from "../prompts/index";
import { mapPositionToEnglish, mapCategoryToEnglish } from "../utils/mappings";

export interface GenerateSuggestionArgs {
  context: string;
  type: 'topic' | 'content' | 'goals' | 'duration' | 'activity' | 'position' | 'contentGoals' | 'skillGoals' | 'priorKnowledge' | 'gradeLevel' | 'category' | 'description';
  currentValue: string;
  message?: string;
  materials?: { title: string; content: string } | string;
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
      ["topic", "content", "goals", "duration", "activity", "position", "contentGoals", "skillGoals", "priorKnowledge", "gradeLevel", "category", "description"].includes(a.type) &&
      (a.message === undefined || typeof a.message === "string")
 &&
      (a.materials === undefined || typeof a.materials === "string" || (typeof a.materials === "object" && typeof a.materials.title === "string" && typeof a.materials.content === "string"))
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
      } else if (args.type === 'category') {
        mappedSuggestion = mapCategoryToEnglish(suggestion.trim());
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
