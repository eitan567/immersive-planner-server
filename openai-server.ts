import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

import { CONFIG } from "./config.ts";
import { AIProvider } from "./providers/types.ts";
import { logDebug, logError } from "./utils/logging.ts";
// import { createCorsHeaders } from "./utils/http.ts";

import {
  GenerateSuggestionArgs,
  UpdateLessonFieldArgs
} from "./types.ts";

// Providers
import { LMStudioProvider } from "./providers/lmstudio.ts";
import { OpenAIProvider } from "./providers/openai.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { GoogleAIProvider } from "./providers/google.ts";
import { DeepSeekProvider } from "./providers/deepseek.ts";
import { OllamaProvider } from "./providers/ollama.ts";

/**
 * Checks if the LM Studio server is reachable and healthy.
 */
async function checkLMStudioHealth(baseUrl: string): Promise<boolean> {
  try {
    console.log("Checking LM Studio health at:", baseUrl);
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hebrew-mistral-7b",
        messages: [{ role: "user", content: "test" }],
        temperature: 0.7,
        max_tokens: -1,
        stream: false
      })
    });
    if (!response.ok) {
      console.error("LM Studio health check failed:", await response.text());
      return false;
    }
    const data = await response.json();
    console.log("LM Studio health check response:", data);
    return true;
  } catch (error) {
    console.error("LM Studio health check error:", error);
    return false;
  }
}

/**
 * A class that implements the AI server logic using an AIProvider.
 * It sets up MCP tool handlers and also provides a handleHttpRequest method
 * for direct HTTP usage.
 */
class AIServer {
  private mcp: Server;
  private provider: AIProvider;
  private transport: StdioServerTransport;

  constructor(provider: AIProvider) {
    this.provider = provider;
    this.transport = new StdioServerTransport();
    this.mcp = new Server(
      { name: "ai-server", version: "0.1.0", timeoutMs: 300000 },
      { capabilities: { tools: {} } }
    );
    this.setupToolHandlers();
  }

  /**
   * Connects the server to the MCP transport.
   */
  async initialize(): Promise<void> {
    try {
      await this.mcp.connect(this.transport);
      logDebug("AIServer", "MCP Server connected");
    } catch (error) {
      logError("AIServer", "Failed to initialize MCP server:", error);
      throw error;
    }
  }

  /**
   * Type guard to validate GenerateSuggestionArgs.
   */
  private isValidSuggestionArgs(args: unknown): args is GenerateSuggestionArgs {
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

  /**
   * Type guard to validate UpdateLessonFieldArgs.
   */
 
  // Update these methods in your openai-server.ts file

private isValidUpdateFieldArgs(args: unknown): args is UpdateLessonFieldArgs {
  if (!args || typeof args !== 'object') {
    logError('Validation', 'args is not an object', args);
    return false;
  }

  const a = args as Partial<UpdateLessonFieldArgs>;
  
  // Validate message
  if (typeof a.message !== 'string' || !a.message.trim()) {
    logError('Validation', 'invalid message', a.message);
    return false;
  }

  // Validate fieldLabels
  if (!a.fieldLabels || typeof a.fieldLabels !== 'object' || Array.isArray(a.fieldLabels)) {
    logError('Validation', 'invalid fieldLabels', a.fieldLabels);
    return false;
  }

  // Validate currentValues if provided
  if (a.currentValues !== undefined) {
    if (typeof a.currentValues !== 'object' || Array.isArray(a.currentValues)) {
      logError('Validation', 'invalid currentValues', a.currentValues);
      return false;
    }
  }

  // rephrase is optional boolean
  if (a.rephrase !== undefined && typeof a.rephrase !== 'boolean') {
    logError('Validation', 'invalid rephrase flag', a.rephrase);
    return false;
  }

  return true;
}

// Add this helper function to your openai-server.ts
private cleanJsonResponse(response: string): string {
  try {
    console.log('Original response:', response);
    
    // First, try to find an array pattern
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const cleaned = arrayMatch[0].trim();
      console.log('Found array JSON:', cleaned);
      // Verify it's valid JSON
      JSON.parse(cleaned);
      return cleaned;
    }
    
    // If no array found, try to find a single object and wrap it in an array
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      const cleaned = `[${objectMatch[0].trim()}]`;
      console.log('Found object JSON, wrapping in array:', cleaned);
      // Verify it's valid JSON
      JSON.parse(cleaned);
      return cleaned;
    }
    
    console.error('No valid JSON structure found');
    throw new Error('No valid JSON structure found in response');
  } catch (error) {
    console.error('Cleaning error:', error);
    throw error;
  }
}

async handleHttpRequest(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Method not allowed"
        },
        id: null
      }),
      {
        status: 405,
        headers: corsHeaders
      }
    );
  }

  try {
    const body = await request.json();
    
    if (body.method !== "call_tool") {
      throw new Error("Unsupported method");
    }

    // Validate server name
    if (body.params.server_name !== "ai-server") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Server not found"
          },
          id: body.id
        }),
        {
          status: 404,
          headers: corsHeaders
        }
      );
    }

    switch (body.params.name) {
      case "generate_suggestion": {
        const rawArgs = body.params.arguments;
        
        try {
          // Validate arguments first
          if (!this.isValidSuggestionArgs(rawArgs)) {
            return new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                error: {
                  code: -32602,
                  message: "Invalid arguments for generate_suggestion"
                },
                id: body.id
              }),
              {
                status: 400,
                headers: corsHeaders
              }
            );
          }

          // Generate the suggestion using the same flow as MCP handler
          console.log('Generating suggestion with args:', rawArgs);
          const prompt = this.createGeneratePrompt(rawArgs as GenerateSuggestionArgs);
          console.log('Using prompt:', prompt);
          const suggestion = await this.provider.generateCompletion(prompt);
          console.log('Generated suggestion:', suggestion);

          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              result: {
                content: [{ type: "text", text: suggestion }]
              },
              id: body.id
            }),
            {
              status: 200,
              headers: corsHeaders
            }
          );
        } catch (error) {
          console.error('Generate suggestion error:', error);
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : "Failed to generate suggestion"
              },
              id: body.id
            }),
            {
              status: 500,
              headers: corsHeaders
            }
          );
        }
      }
      
      case "update_lesson_field": {
        const rawArgs = body.params.arguments;
        
        if (!this.isValidUpdateFieldArgs(rawArgs)) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32602,
                message: "Invalid arguments for update_lesson_field"
              },
              id: body.id
            }),
            {
              status: 400,
              headers: corsHeaders
            }
          );
        }
      
        try {
          const prompt = this.createUpdatePrompt(rawArgs);
          console.log('Sending prompt:', prompt);
      
          const response = await this.provider.generateCompletion(prompt);
          console.log('Received response:', response);
          
          if (!this.validateResponse(response)) {
            console.error('Response validation failed');
            throw new Error('Invalid response format');
          }
      
          const cleaned = this.cleanJsonResponse(response);
          console.log('Final cleaned response:', cleaned);
          
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              result: {
                content: [{ type: "text", text: cleaned }]
              },
              id: body.id
            }),
            {
              status: 200,
              headers: corsHeaders
            }
          );
      
        } catch (error) {
          console.error('Handler error:', error);
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : "Failed to generate completion"
              },
              id: body.id
            }),
            {
              status: 500,
              headers: corsHeaders
            }
          );
        }
      }

      // Handle other cases...
      default:
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: "Unknown tool"
            },
            id: body.id
          }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error"
        },
        id: null
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

private validateResponse(response: string): boolean {
  try {
    console.log('Original response:', response);
    const cleaned = this.cleanJsonResponse(response);
    console.log('Cleaned response:', cleaned);
    
    const parsed = JSON.parse(cleaned);
    console.log('Parsed response:', parsed);
    
    // If it's a single object, wrap it in an array
    const updates = Array.isArray(parsed) ? parsed : [parsed];
    
    // Validate each update
    return updates.every(update => {
      // Check required fields
      if (!update.fieldToUpdate || !update.userResponse || !update.newValue) {
        console.log('Missing fields for update:', update);
        return false;
      }
      
      // Check types
      if (typeof update.fieldToUpdate !== 'string' ||
          typeof update.userResponse !== 'string' ||
          typeof update.newValue !== 'string') {
        console.log('Invalid types for update:', update);
        return false;
      }
      
      
      return true;
    });
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

  /**
   * Registers tool handlers for the MCP server.
   */
  private setupToolHandlers(): void {
    // ListTools handler: returns the available tools
    // SetUp tools
    const tools = [
      {
        name: "generate_suggestion",
        description: "Generate an AI suggestion for lesson plan content",
        inputSchema: {
          type: "object",
          properties: {
            context: {
              type: "string",
              description: "Current content or context"
            },
            type: {
              type: "string",
              enum: ["topic", "content", "goals", "duration", "activity"]
            },
            currentValue: { type: "string" },
            message: {
              type: "string",
              description: "Optional chat message for refining suggestions"
            }
          },
          required: ["context", "type", "currentValue"]
        }
      },
      {
        name: "update_lesson_field",
        description: "Parse user message and update lesson field",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
            fieldLabels: {
              type: "object",
              additionalProperties: { type: "string" }
            },
            rephrase: {
	      type: "boolean",
              description: "Whether to rephrase/improve the field content instead of direct update"
            },
            currentValues: {
              type: "object",
              description: "Current values of the fields",
              additionalProperties: { type: "string" }
            }
          },
          required: ["message", "fieldLabels", "currentValues"]
        }
      }
    ];

    // Register tools in ListToolsRequestSchema
    this.mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools
    }));

    // CallTool handler: Handle both generate_suggestion and update_lesson_field
    this.mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const rawArgs = request.params.arguments;

      try {
        switch (toolName) {
          case "generate_suggestion": {
            if (!this.isValidSuggestionArgs(rawArgs)) {
              throw new McpError(ErrorCode.InvalidParams, "Invalid arguments for generate_suggestion");
            }
            const prompt = this.createGeneratePrompt(rawArgs as GenerateSuggestionArgs);
            const suggestion = await this.provider.generateCompletion(prompt);
            return {
              content: [{ type: "text", text: suggestion }]
            };
          }

          case "update_lesson_field": {
            if (!this.isValidUpdateFieldArgs(rawArgs)) {
              throw new McpError(ErrorCode.InvalidParams, "Invalid arguments for update_lesson_field");
            }
            const prompt = this.createUpdatePrompt(rawArgs as UpdateLessonFieldArgs);
            const response = await this.provider.generateCompletion(prompt);
            const cleaned = this.cleanJsonResponse(response);
            return {
              content: [{ type: "text", text: cleaned }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${toolName}`
            );
        }
      } catch (error) {
        logError("AIServer", `Error in ${toolName}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : "Failed to process request"
        );
      }
    });
  }

  /**
   * Builds the prompt for generate_suggestion.
   */
  private createGeneratePrompt(args: GenerateSuggestionArgs): string {
    let prompt = `בהתבסס על ההקשר הבא: "${args.context}"
והתוכן הנוכחי: "${args.currentValue || "ריק"}"`;

    if (args.message) {
      prompt += `\nבהתייחס להודעה הבאה: "${args.message}"`;
    }
    prompt += "\n\n";

    switch (args.type) {
      case "topic":
        prompt += "הצע נושא יחידה מתאים שיתאים להוראה בחדר אימרסיבי.";
        break;
      case "content":
        prompt += "הצע תיאור מפורט לפעילות לימודית שתתאים לחדר אימרסיבי.";
        break;
      case "goals":
        prompt += "הצע מטרות למידה ספציפיות ומדידות.";
        break;
      case "duration":
        prompt += "הצע משך זמן מתאים לפעילות זו, תוך התחשבות באופי הפעילות וקהל היעד.";
        break;
      case "activity":
        prompt += "הצע פעילות לימודית שתנצל את היכולות הייחודיות של החדר האימרסיבי.";
        break;
      default:
        prompt += "הצע שיפור או חלופה לתוכן הנוכחי.";
        break;
    }

    return prompt;
  }


  // Add this debug method
private logCurrentValues(args: UpdateLessonFieldArgs) {
  console.log('Current Values Debug:');
  console.log('Raw currentValues:', args.currentValues);
  console.log('Field Labels:', args.fieldLabels);
  
  // Show how values are mapped
  Object.entries(args.fieldLabels).forEach(([key, label]) => {
    console.log(`Field ${label} (${key}):`, args.currentValues?.[key] || '(ריק)');
  });
}
  /**
   * Builds the prompt for update_lesson_field.
   */
  // Update createUpdatePrompt to use and check values properly
private createUpdatePrompt(args: UpdateLessonFieldArgs): string {
  // Debug log
  this.logCurrentValues(args);

  // מיפוי השדות והערכים שלהם
  const fieldsContext = Object.entries(args.fieldLabels)
    .map(([key, label]) => {
      const value = args.currentValues?.[key];
      // בדיקה מפורטת של הערך
      console.log(`Mapping field ${key}:`, { label, value });
      return `${label}: ${value || '(ריק)'}`;
    })
    .join('\n');

  // לוג את ההקשר המלא
  console.log('Fields Context:', fieldsContext);

  const fieldsMapping = Object.entries(args.fieldLabels)
    .map(([key, label]) => `"${label}": "${key}"`)
    .join('\n');

  return `אתה עוזר למורים לשפר את תוכן השיעור שלהם.

[הנחיות חובה]

משימתך מתחלקת לשני סוגי שדות:
1. פרטי השיעור (נושא, זמן, מטרות וכו')
2. בניית השיעור (פתיחה, גוף, סיכום - כל אחד כולל תוכן ושימוש במרחב)

כללי הטיפול בשדות:

1. כשנאמר "הצע ערכים לכל השדות":
   - חובה לעדכן את כל השדות בלי יוצא מן הכלל!
   - גם שדות ריקים וגם שדות מלאים
   - גם פרטי השיעור וגם בניית השיעור
   - תן תוכן מפורט וחדש לכל שדה
   
2. כשנאמר "מלא שדות ריקים":
   - עדכן רק שדות המסומנים (ריק)
   - אל תיגע בשדות מלאים

3. חובה להוסיף תגית UI בסוף כל תשובה:
   - פרטי שיעור: "<שדה: נושא היחידה>"
   - בניית שיעור: "<שדה: פתיחה - תוכן/פעילות>"

4. הנחיות לבניית השיעור:
   בכל תוכן פעילות יש לפרט:
   - מה התלמידים עושים
   - איך משתמשים במסכים
   - איך מאורגן המרחב
   - מה המורה עושה
   

[מיפוי שדות]
${fieldsMapping}

[מצב נוכחי של השדות]
${fieldsContext}

[בקשת המשתמש]
${args.message}

חובה להחזיר אך ורק מערך JSON בפורמט הבא (כולל המבנה המדויק של הסוגריים):

[
  {
    "fieldToUpdate": "duration",
    "userResponse": "הסבר על השינוי",
    "newValue": "ערך מדויק"
  }
]

אם אתה משנה מספר שדות, צריך להיות בדיוק כך:

[
  {
    "fieldToUpdate": "duration",
    "userResponse": "הסבר על השינוי",
    "newValue": "ערך מדויק"
  },
  {
    "fieldToUpdate": "gradeLevel",
    "userResponse": "הסבר על השינוי",
    "newValue": "ערך מדויק"
  }
]

דוגמה לתשובה מלאה:
[
  {
    "fieldToUpdate": "topic",
    "userResponse": "עדכנתי את נושא היחידה לנושא מרתק המתאים במיוחד לחדר האימרסיבי <שדה: נושא היחידה>",
    "newValue": "מסע אל מערכת השמש - חקר כוכבי הלכת בסביבה אימרסיבית"
  },
  {
    "fieldToUpdate": "opening.0.content",
    "userResponse": "הוספתי פעילות פתיחה שמנצלת את המסכים והחלל באופן מיטבי <שדה: פתיחה - תוכן/פעילות>",
    "newValue": "התלמידים נכנסים לחדר חשוך כשעל שלושת המסכים מוקרנים שמי הלילה מזוויות שונות. המורה מציגה שאלה מעוררת חשיבה על המסך המרכזי: 'מה קורה לכוכבים ביום?' התלמידים מתפזרים בחלל ורושמים את השערותיהם על טאבלטים."
  },
  {
    "fieldToUpdate": "opening.0.spaceUsage",
    "userResponse": "ארגנתי את החלל לפעילות הפתיחה <שדה: פתיחה - שימוש במרחב>",
    "newValue": "התלמידים מפוזרים ברחבי החדר החשוך, כל קבוצה באזור אחר. המורה במרכז החדר."
  }
]

חובה:
1. השתמש רק במפתחות הטכניים שמופיעים במיפוי למעלה (כמו "duration", לא "זמן כולל")
2. תמיד תחזיר מערך שמתחיל ב-[ ומסתיים ב-], גם אם יש רק פריט אחד
3. וודא שהפסיקים והרווחים בדיוק כמו בדוגמה (2 רווחים להזחה)
4. אסור להוסיף טקסט מחוץ ל-JSON
  
  חשוב: 
  - הערך של "newValue" חייב להיות טקסט ולא מערך של טקסטים"
  - הערך ב-newValue חייב להיות הערך הסופי והמלא, לא תבנית
  - אל תשתמש בסימני [] או תבניות למילוי
  - תן ערך מוחלט ומלא שמתאים לשדה`;
  }
}

/**
 * Create the AIProvider instance based on the environment config.
 */
function createProvider(): AIProvider {
  const provider = CONFIG.AI_PROVIDER?.toLowerCase();
  logDebug("Provider Factory", "Selected provider:", provider);

  switch (provider) {
    case "anthropic": {
      if (!CONFIG.ANTHROPIC_API_KEY) {
        throw new Error(
          "ANTHROPIC_API_KEY environment variable is required for Anthropic provider"
        );
      }
      return new AnthropicProvider({
        apiKey: CONFIG.ANTHROPIC_API_KEY,
        model: CONFIG.ANTHROPIC_MODEL
      });
    }
    case "google": {
      if (!CONFIG.GOOGLE_API_KEY) {
        throw new Error(
          "GOOGLE_API_KEY environment variable is required for Google AI provider"
        );
      }
      return new GoogleAIProvider({
        apiKey: CONFIG.GOOGLE_API_KEY,
        model: CONFIG.GOOGLE_MODEL
      });
    }
    case "deepseek": {
      if (!CONFIG.DEEPSEEK_API_KEY || !CONFIG.DEEPSEEK_BASE_URL) {
        throw new Error(
          "DEEPSEEK_API_KEY and DEEPSEEK_BASE_URL are required for DeepSeek provider"
        );
      }
      return new DeepSeekProvider({
        baseUrl: CONFIG.DEEPSEEK_BASE_URL,
        apiKey: CONFIG.DEEPSEEK_API_KEY,
        model: CONFIG.DEEPSEEK_MODEL
      });
    }
    case "ollama": {
      return new OllamaProvider({
        baseUrl: CONFIG.OLLAMA_BASE_URL,
        model: CONFIG.OLLAMA_MODEL
      });
    }
    case "lmstudio": {
      return new LMStudioProvider({
        baseUrl: CONFIG.LM_STUDIO_BASE_URL,
        model: CONFIG.LM_STUDIO_MODEL
      });
    }
    default: {
      // default to openai
      if (!CONFIG.OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable is required for OpenAI provider"
        );
      }
      return new OpenAIProvider({
        apiKey: CONFIG.OPENAI_API_KEY,
        model: CONFIG.OPENAI_MODEL
      });
    }
  }
}

/**
 * Start the server.
 * If the provider is LM Studio, do a health check first.
 */
async function startServer() {
  console.log("Starting server...");

  if (CONFIG.AI_PROVIDER === "lmstudio") {
    console.log("Checking LM Studio health before starting server...");
    const isHealthy = await checkLMStudioHealth(CONFIG.LM_STUDIO_BASE_URL);
    if (!isHealthy) {
      console.error("LM Studio is not accessible. Please ensure it is running.");
      Deno.exit(1);
    }
    console.log("LM Studio health check passed!");
  }

  const aiServer = new AIServer(createProvider());
  await aiServer.initialize();

  const PORT = 8000;
  console.log(`AI MCP server running on http://localhost:${PORT}`);

// In openai-server.ts

// Update the serve function call to include CORS headers in the serve options
  await serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const url = new URL(req.url);
      if (url.pathname === "/mcp") {
        const response = await aiServer.handleHttpRequest(req);
        
        // Ensure CORS headers are present in all responses
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type": "application/json",
        };

        const responseText = await response.text();
        
        try {
          // Verify JSON is valid
          JSON.parse(responseText);
          return new Response(responseText, {
            status: response.status,
            headers: corsHeaders
          });
        } catch (e) {
          console.error("Invalid JSON response:", responseText);
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: "Server returned invalid JSON response"
              }
            }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: "Endpoint not found"
            }
          }),
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Content-Type": "application/json",
            }
          }
        );
      }
    } catch (error) {
      console.error("Server error:", error);
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Critical server error"
          }
        }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-Type": "application/json",
          }
        }
      );
    }
  }, { 
    port: PORT,
    // Add CORS headers to all responses by default
    onError: (error) => {
      console.error("Server error:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-Type": "application/json",
          }
        }
      );
    }
  });
}

// Start the server.
startServer().catch(error => {
  console.error("Failed to start server:", error);
  Deno.exit(1);
});
