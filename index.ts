import { OpenAIProvider } from "./providers/openai.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { GoogleAIProvider } from "./providers/google.ts";
import { LMStudioProvider } from "./providers/lmstudio.ts";
import { DeepSeekProvider } from "./providers/deepseek.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { CONFIG } from "./config.ts";
import AIServer from "./server.ts";
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

let provider;

// Initialize the appropriate provider based on configuration
switch (CONFIG.AI_PROVIDER.toLowerCase()) {
  case "openai":
    provider = new OpenAIProvider({
      apiKey: CONFIG.OPENAI_API_KEY,
      model: CONFIG.OPENAI_MODEL
    });
    break;
  case "anthropic":
    provider = new AnthropicProvider({
      apiKey: CONFIG.ANTHROPIC_API_KEY,
      model: CONFIG.ANTHROPIC_MODEL
    });
    break;
  case "google":
    provider = new GoogleAIProvider({
      apiKey: CONFIG.GOOGLE_API_KEY,
      model: CONFIG.GOOGLE_MODEL
    });
    break;
  case "lmstudio":
    provider = new LMStudioProvider({
      baseUrl: CONFIG.LM_STUDIO_BASE_URL,
      apiKey: CONFIG.LM_STUDIO_API_KEY,
      model: CONFIG.LM_STUDIO_MODEL
    });
    break;
  case "deepseek":
    provider = new DeepSeekProvider({
      baseUrl: CONFIG.DEEPSEEK_BASE_URL,
      apiKey: CONFIG.DEEPSEEK_API_KEY,
      model: CONFIG.DEEPSEEK_MODEL
    });
    break;
  case "ollama":
    provider = new OllamaProvider({
      baseUrl: CONFIG.OLLAMA_BASE_URL,
      model: CONFIG.OLLAMA_MODEL
    });
    break;
  default:
    throw new Error(`Unknown provider: ${CONFIG.AI_PROVIDER}`);
}

const server = new AIServer(provider);

// Connect to MCP over stdio
server.initialize().catch(error => {
  console.error("Failed to initialize server:", error);
  Deno.exit(1);
});

// Also serve HTTP endpoint for direct API access
const PORT = 8000;
console.log(`HTTP server running on http://localhost:${PORT}`);

await serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(req.url);
    if (url.pathname === "/mcp") {
      if (req.method !== "POST") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32600, message: "Method not allowed" }
          }),
          { status: 405, headers: corsHeaders }
        );
      }

      const body = await req.json();
      console.log("Received request:", body);

      if (body.method !== "call_tool") {
        throw new Error("Unsupported method");
      }

      // Handle the request using our MCP server
      const result = await server.handleMcpRequest({
        jsonrpc: "2.0",
        id: body.id,
        method: body.method,
        params: {
          name: body.params.name,
          arguments: body.params.arguments
        }
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32601, message: "Endpoint not found" }
      }),
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error"
        }
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}, { port: PORT });