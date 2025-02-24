import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler } from "./types.ts";
import { AIProvider } from "../providers/types.ts";
import { generateFullLessonPrompt } from "../prompts/index.ts";

export interface GenerateFullLessonArgs {
  topic?: string;
  materials?: string;
  category?: string;
  fieldLabels: Record<string, string>;
}

export class GenerateHandler implements ToolHandler<GenerateFullLessonArgs> {
  constructor(private provider: AIProvider) {}

  isValidArgs(args: unknown): args is GenerateFullLessonArgs {
    if (!args || typeof args !== 'object') {
      console.error('Validation', 'args is not an object', args);
      return false;
    }

    const a = args as Partial<GenerateFullLessonArgs>;
    
    // וידוא שלפחות אחד מהשדות קיים ותקין
    const hasValidTopic = a.topic && typeof a.topic === 'string' && a.topic.trim().length > 0;
    const hasValidCategory = a.category && typeof a.category === 'string' && a.category.trim().length > 0;
    const hasValidMaterials = a.materials && typeof a.materials === 'string' && a.materials.trim().length > 0;

    if (!hasValidTopic && !hasValidCategory && !hasValidMaterials) {
      console.error('Validation', 'at least one field must be provided', { topic: a.topic, category: a.category, materials: a.materials });
      return false;
    }

    // בדיקת תקינות של השדות שהוזנו
    if (a.topic !== undefined && (typeof a.topic !== 'string' || !a.topic.trim())) {
      console.error('Validation', 'invalid topic', a.topic);
      return false;
    }

    if (a.category !== undefined && (typeof a.category !== 'string' || !a.category.trim())) {
      console.error('Validation', 'invalid category', a.category);
      return false;
    }

    if (a.materials !== undefined && (typeof a.materials !== 'string' || !a.materials.trim())) {
      console.error('Validation', 'invalid materials', a.materials);
      return false;
    }

    if (!a.fieldLabels || typeof a.fieldLabels !== 'object') {
      console.error('Validation', 'invalid fieldLabels', a.fieldLabels);
      return false;
    }

    return true;
  }

  async execute(args: GenerateFullLessonArgs) {
    try {
      const prompt = generateFullLessonPrompt(args);
      console.log('[Generate Handler] Sending prompt to AI:', prompt);
      
      const response = await this.provider.generateCompletion(prompt);
      console.log('[Generate Handler] Raw AI response:', response);
      
      try {
        // נסה לפרסר את התשובה המלאה
        const parsed = JSON.parse(response);
        console.log('[Generate Handler] Successfully parsed response:', parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(parsed) }]
        };
      } catch (parseError) {
        // אם הפרסור נכשל, נסה לנקות את התשובה
        try {
          console.log('[Generate Handler] Trying to clean and parse response');
          
          // הסרת סימני markdown
          const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          console.log('[Generate Handler] Cleaned response:', cleanedResponse);
          
          // בדיקת תקינות ה-JSON
          const parsed = JSON.parse(cleanedResponse);
          console.log('[Generate Handler] Successfully parsed JSON:', parsed);
          
          // החזרת ה-JSON המנוקה
          return {
            content: [{ type: "text", text: JSON.stringify(parsed) }]
          };
        } catch (cleanError) {
          // אם גם הניקוי נכשל, זרוק שגיאה
          console.error('Failed to parse AI response:', response);
          throw new Error('Invalid JSON response from AI');
        }
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : "Failed to generate lesson plan"
      );
    }
  }
}
