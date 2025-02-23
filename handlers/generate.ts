import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, cleanJsonResponse } from "./types.ts";
import { AIProvider } from "../providers/types.ts";

export interface GenerateFullLessonArgs {
  topic: string;
  materials?: string;
  category: string;
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
    
    if (typeof a.topic !== 'string' || !a.topic.trim()) {
      console.error('Validation', 'invalid topic', a.topic);
      return false;
    }

    if (typeof a.category !== 'string' || !a.category.trim()) {
      console.error('Validation', 'invalid category', a.category);
      return false;
    }

    if (a.materials !== undefined && typeof a.materials !== 'string') {
      console.error('Validation', 'invalid materials', a.materials);
      return false;
    }

    if (!a.fieldLabels || typeof a.fieldLabels !== 'object') {
      console.error('Validation', 'invalid fieldLabels', a.fieldLabels);
      return false;
    }

    return true;
  }

  private createPrompt(args: GenerateFullLessonArgs): string {
    const materialsSection = args.materials 
      ? `\nחומרי למידה שסופקו:\n${args.materials}`
      : '';

    return `אתה עוזר למורים לתכנן שיעורים בחדר אימרסיבי. עליך ליצור תכנון שיעור מלא בהתבסס על המידע הבא:

[מידע על השיעור]
נושא: ${args.topic}
קטגוריה: ${args.category}${materialsSection}

[הנחיות]
עליך ליצור תכנון שיעור מלא שיכלול:

1. פרטי שיעור בסיסיים:
   - משך זמן (duration)
   - שכבת גיל (gradeLevel) 
   - ידע קודם נדרש (priorKnowledge)
   - מטרות תוכן (contentGoals) - חזור כמחרוזת אחת מופרדת בפסיקים
   - מטרות מיומנות (skillGoals) - חזור כמחרוזת אחת מופרדת בפסיקים
   - סידור מרחבי (position) - חובה לבחור אחד מ: פתיחת נושא, הקנייה, תרגול, סיכום נושא
   - תיאור כללי (description)

2. מבנה השיעור (שדות בתוך sections):
   כל שלב (opening, main, summary) צריך לכלול מערך של פעילויות, כאשר כל פעילות מכילה:
   - תוכן הפעילות (content)
   - שימוש במרחב (spaceUsage) - חובה לבחור אחד מ: מליאה, עבודה בקבוצות, עבודה אישית, משולב
   - הגדרות מסכים:
     * סוג מסך (screen1, screen2, screen3) - חובה לבחור מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת
     * תיאור מסך (screen1Description, screen2Description, screen3Description)

חובה להחזיר JSON בפורמט הבא:
{
  "duration": "משך הזמן",
  "gradeLevel": "שכבת גיל",
  "priorKnowledge": "ידע קודם נדרש",
  "position": "סידור מרחבי - אחד מ: פתיחת נושא, הקנייה, תרגול, סיכום נושא",
  "contentGoals": "מטרות תוכן מופרדות בפסיקים",
  "skillGoals": "מטרות מיומנות מופרדות בפסיקים",
  "description": "תיאור כללי",
  "sections": {
    "opening": [{
      "content": "תוכן הפעילות",
      "spaceUsage": "שימוש במרחב - אחד מ: מליאה, עבודה בקבוצות, עבודה אישית, משולב",
      "screen1": "סוג מסך 1",
      "screen1Description": "תיאור מסך 1",
      "screen2": "סוג מסך 2",
      "screen2Description": "תיאור מסך 2",
      "screen3": "סוג מסך 3",
      "screen3Description": "תיאור מסך 3"
    }],
    "main": [{
      "content": "תוכן הפעילות",
      "spaceUsage": "שימוש במרחב",
      "screen1": "סוג מסך 1",
      "screen1Description": "תיאור מסך 1",
      "screen2": "סוג מסך 2",
      "screen2Description": "תיאור מסך 2",
      "screen3": "סוג מסך 3",
      "screen3Description": "תיאור מסך 3"
    }],
    "summary": [{
      "content": "תוכן הפעילות",
      "spaceUsage": "שימוש במרחב",
      "screen1": "סוג מסך 1",
      "screen1Description": "תיאור מסך 1",
      "screen2": "סוג מסך 2",
      "screen2Description": "תיאור מסך 2",
      "screen3": "סוג מסך 3",
      "screen3Description": "תיאור מסך 3"
    }]
  }
}

חשוב:
1. מטרות תוכן ומטרות מיומנות צריכות להיות מחרוזת אחת עם פסיקים, לא מערך
2. הקפד על הפורמט המדויק ללא שינויים
3. אל תוסיף שדות נוספים
4. תן תשובה בעברית בלבד
5. החזר JSON תקין שניתן לפרסור`;
  }

  async execute(args: GenerateFullLessonArgs) {
    try {
      const prompt = this.createPrompt(args);
      const response = await this.provider.generateCompletion(prompt);
      
      try {
        // נסה לפרסר את התשובה המלאה
        const parsed = JSON.parse(response);
        return {
          content: [{ type: "text", text: JSON.stringify(parsed) }]
        };
      } catch (parseError) {
        // אם הפרסור נכשל, נסה לנקות את התשובה
        try {
          const cleanedResponse = cleanJsonResponse(response);
          const parsed = JSON.parse(cleanedResponse);
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