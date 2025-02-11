import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, cleanJsonResponse } from "./types.ts";
import { AIProvider } from "../providers/types.ts";
import { generateUpdatePrompt } from "../prompts/index.ts";
import { mapPositionToEnglish, mapSpaceUsageToEnglish, mapScreenTypeToEnglish } from "../utils/mappings.ts";

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
      
      // Parse the cleaned response
      const parsedResponse = JSON.parse(cleanedResponse);
      
      // Map Hebrew values to English for specific fields
      //const mappedResponse = parsedResponse.map((item: any) => {
        // if (item.fieldToUpdate === 'position') {
        //   return {
        //     ...item,
        //     newValue: mapPositionToEnglish(item.newValue)
        //   };
        // }
        // if (item.fieldToUpdate.includes('.screenUsage')) {
        //   return {
        //     ...item,
        //     newValue: mapSpaceUsageToEnglish(item.newValue)
        //   };
        // }
        // if (item.fieldToUpdate.includes('.screen1') || 
        //     item.fieldToUpdate.includes('.screen2') || 
        //     item.fieldToUpdate.includes('.screen3')) {
        //   return {
        //     ...item,
        //     newValue: mapScreenTypeToEnglish(item.newValue)
        //   };
        // }

       // console.log('No mapping for field :', item);
       // return item;
     // });

      return {
        content: [{ type: "text", text: JSON.stringify(parsedResponse) }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : "Failed to process update request"
      );
    }
  }
}
