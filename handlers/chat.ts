import { AIProvider } from "../providers/types";
import { ToolHandler } from "./types";

export interface ChatArgs {
  message: string;
  currentValues: Record<string, string>;
  fieldLabels: Record<string, string>;
  history: Array<{
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
  }>;
}

export class ChatHandler implements ToolHandler<ChatArgs> {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  isValidArgs(args: unknown): args is ChatArgs {
    if (!args || typeof args !== "object") return false;
    const a = args as Partial<ChatArgs>;
    
    return (
      typeof a.message === "string" &&
      a.currentValues !== undefined &&
      typeof a.currentValues === "object" &&
      Array.isArray(a.history) &&
      a.fieldLabels !== undefined &&
      typeof a.fieldLabels === "object"
    );
  }

  private createPrompt(args: ChatArgs): string {
    const contextSection = Object.entries(args.currentValues)
      .map(([key, value]) => {
        const label = args.fieldLabels?.[key] || key;
        return `${label}: ${value || '(ריק)'}`;
      })
      .join('\n');

    const historySection = args.history
      .map(msg => `${msg.sender === 'user' ? 'משתמש' : 'מערכת'}: ${msg.text}`)
      .join('\n');

    return `אתה עוזר למורים לתכנן שיעורים בחדר אימרסיבי.

[מצב נוכחי של השיעור]
${contextSection}

[היסטוריית השיחה]
${historySection}

[הנחיות]
1. אתה יועץ מומחה בתחום החינוך עם התמחות בהוראה בחדר אימרסיבי
2. התייחס לתוכן השיעור ולערכים הנוכחיים בתשובותיך
3. כשהמשתמש שואל שאלה, תן תשובה מפורטת ומקצועית
4. כשהמשתמש מבקש רעיונות, הצע רעיונות מעשיים שמתאימים לחדר אימרסיבי
5. שמור על שיחה טבעית ומקצועית

[בקשת המשתמש]
${args.message}

ענה בצורה מקצועית, תוך התייחסות להקשר השיעור. אל תציין שאתה AI, פשוט ענה כמומחה מקצועי.`;
  }

  async execute(args: ChatArgs) {
    const prompt = this.createPrompt(args);
    const response = await this.provider.generateCompletion(prompt);

    if (!response) {
      throw new Error("No response from AI provider");
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ response }) }]
    };
  }
}