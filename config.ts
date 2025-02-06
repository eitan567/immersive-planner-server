import * as dotenv from "https://deno.land/std@0.181.0/dotenv/mod.ts";

console.log('Loading environment variables...');

// Load .env file
await dotenv.load({ export: true });

export const CONFIG = {
  // AI Provider
  AI_PROVIDER: Deno.env.get('AI_PROVIDER') || 'openai',
  
  // OpenAI
  OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
  OPENAI_MODEL: Deno.env.get('OPENAI_MODEL') || 'gpt-4',
  
  // Google
  GOOGLE_API_KEY: Deno.env.get('GOOGLE_API_KEY'),
  GOOGLE_MODEL: Deno.env.get('GOOGLE_MODEL') || 'gemini-pro', // Use more stable model for Hebrew
  
  // Anthropic
  ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY'),
  ANTHROPIC_MODEL: Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-opus-20240229',
  
  // DeepSeek
  DEEPSEEK_BASE_URL: Deno.env.get('DEEPSEEK_BASE_URL'),
  DEEPSEEK_API_KEY: Deno.env.get('DEEPSEEK_API_KEY'),
  DEEPSEEK_MODEL: Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-ai/DeepSeek-R1',
  
  // Ollama
  OLLAMA_BASE_URL: Deno.env.get('OLLAMA_BASE_URL') || 'http://localhost:11434/v1',
  OLLAMA_MODEL: Deno.env.get('OLLAMA_MODEL') || 'mistral',
  
  // LM Studio
  LM_STUDIO_BASE_URL: Deno.env.get('LM_STUDIO_BASE_URL') || 'http://localhost:1234/v1',
  LM_STUDIO_API_KEY: Deno.env.get('LM_STUDIO_API_KEY'),
  LM_STUDIO_MODEL: Deno.env.get('LM_STUDIO_MODEL') || 'gemini-2.0-flash-exp',
};

// Debug configuration
console.log('Configuration loaded:', {
  provider: CONFIG.AI_PROVIDER 
});