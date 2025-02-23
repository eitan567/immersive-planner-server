import { McpError } from "@modelcontextprotocol/sdk/types.js";

export interface ToolHandler<T = unknown> {
  isValidArgs(args: unknown): args is T;
  execute(args: T): Promise<{ content: Array<{ type: string; text: string }> }>;
}

export function cleanJsonResponse(response: string): string {
  try {
    console.log('Original response:', response);
    
    // הסרת סימני markdown
    let cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    console.log('Response after markdown cleanup:', cleanedResponse);
    
    const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const cleaned = arrayMatch[0].trim();
      console.log('Found array JSON:', cleaned);
      JSON.parse(cleaned); // בדיקת תקינות ה-JSON
      return cleaned;
    }
    
    const objectMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      const cleaned = objectMatch[0].trim();
      console.log('Found object JSON:', cleaned);
      // בדיקת תקינות ה-JSON
      JSON.parse(cleaned);
      return cleaned; // מחזירים את האובייקט כמו שהוא, בלי לעטוף במערך
    }
    
    console.error('No valid JSON structure found');
    throw new Error('No valid JSON structure found in response');
  } catch (error) {
    console.error('Cleaning error:', error);
    throw error;
  }
}
