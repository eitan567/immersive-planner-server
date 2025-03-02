import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

import { AIProvider } from "./providers/types";
import { logDebug, logError } from "./utils/logging";
import {
  ChatHandler,
  SuggestionHandler,
  UpdateHandler,
  GenerateHandler,
  ToolHandler
} from "./handlers/index";

interface McpRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params: {
    name: string;
    arguments: unknown;
  };
}

class AIServer {
  private mcp: Server;
  private transport: StdioServerTransport;
  private handlers: Map<string, ToolHandler<unknown>>;

  constructor(provider: AIProvider) {
    this.transport = new StdioServerTransport();
    this.mcp = new Server(
      { name: "ai-server", version: "0.1.0", timeoutMs: 300000 },
      { capabilities: { tools: {} } }
    );

    // Initialize handlers with explicit typing
    this.handlers = new Map<string, ToolHandler<unknown>>([
      ["chat_with_context", new ChatHandler(provider)],
      ["generate_suggestion", new SuggestionHandler(provider)],
      ["update_lesson_field", new UpdateHandler(provider)],
      ["generate_full_lesson", new GenerateHandler(provider)]
    ]);

    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    const tools = [
      {
        name: "chat_with_context",
        description: "Chat with AI about lesson planning with context",
        inputSchema: {
          type: "object",
          properties: {
            materials: { 
              type: "string",
              description: "Optional learning materials provided by the user"
            },
            message: { type: "string" },
            currentValues: { 
              type: "object",
              additionalProperties: { type: "string" }
            },
            history: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  sender: { type: "string", enum: ["user", "ai"] },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            },
            fieldLabels: { type: "object", additionalProperties: { type: "string" } }
          },
          required: ["message", "currentValues", "history", "fieldLabels"]
        }
      },
      {
        name: "generate_suggestion",
        description: "Generate an AI suggestion for lesson plan content",
        inputSchema: {
          type: "object",
          properties: {
            materials: { 
              type: "string",
              description: "Optional learning materials provided by the user"
            },
            context: { type: "string", description: "Current content or context" },
            type: {
              type: "string",
              enum: ["topic", "content", "goals", "duration", "activity", 'description' ]
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
            materials: { 
              type: "string",
              description: "Optional learning materials provided by the user"
            },
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
      },
      {
        name: "generate_full_lesson",
        description: "Generate a complete lesson plan from initial parameters",
        inputSchema: {
          type: "object",
          properties: {
            topic: { 
              type: "string",
              description: "The main topic of the lesson"
            },
            materials: { 
              type: "string",
              description: "Optional learning materials provided by the user"
            },
            category: { 
              type: "string",
              description: "The lesson category (e.g., Math, Science, etc.)"
            },
            fieldLabels: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Hebrew labels for each field"
            }
          },
          required: ["topic", "category", "fieldLabels"]
        }
      }
    ];

    this.mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools
    }));

    this.mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const handler = this.handlers.get(toolName);

      if (!handler) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
      }

      try {
        if (!handler.isValidArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid arguments for ${toolName}`
          );
        }

        return await handler.execute(request.params.arguments);
      } catch (error) {
        logError("AIServer", `Error in ${toolName}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : "Failed to process request"
        );
      }
    });
  }

  async handleMcpRequest(request: McpRequest) {
    if (request.method === "call_tool") {
      const handler = this.handlers.get(request.params.name);
      
      if (!handler) {
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${request.params.name}`
          }
        };
      }

      try {
        if (!handler.isValidArgs(request.params.arguments)) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32602,
              message: `Invalid arguments for ${request.params.name}`
            }
          };
        }

        const result = await handler.execute(request.params.arguments);
        return {
          jsonrpc: "2.0",
          id: request.id,
          result
        };
      } catch (error) {
        logError("AIServer", `Error in ${request.params.name}:`, error);
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error"
          }
        };
      }
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32601,
        message: "Method not supported"
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.mcp.connect(this.transport);
      logDebug("AIServer", "MCP Server connected");
    } catch (error) {
      logError("AIServer", "Failed to initialize MCP server:", error);
      throw error;
    }
  }
}

export default AIServer;