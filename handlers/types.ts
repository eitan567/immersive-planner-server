import { McpError } from "@modelcontextprotocol/sdk/types.js";

export interface ToolHandler<T = unknown> {
  isValidArgs(args: unknown): args is T;
  execute(args: T): Promise<{ content: Array<{ type: string; text: string }> }>;
}

export function cleanJsonResponse(response: string): string {
  try {
    console.log('Original response:', response);
    
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const cleaned = arrayMatch[0].trim();
      console.log('Found array JSON:', cleaned);
      JSON.parse(cleaned); // Validate it's valid JSON
      return cleaned;
    }
    
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      const cleaned = `[${objectMatch[0].trim()}]`;
      console.log('Found object JSON, wrapping in array:', cleaned);
      JSON.parse(cleaned); // Validate it's valid JSON
      return cleaned;
    }
    
    console.error('No valid JSON structure found');
    throw new Error('No valid JSON structure found in response');
  } catch (error) {
    console.error('Cleaning error:', error);
    throw error;
  }
}