import * as dotenv from "https://deno.land/std@0.181.0/dotenv/mod";
import { Deno } from "https://deno.land/std@0.181.0/types/mod.d";

console.log('Loading environment variables...');

// Load .env file
await dotenv.load({ export: true });

export const CONFIG = {
  // AI Provider
  AI_PROVIDER: Deno.env.get('AI_PROVIDER') || 'openai',
  
  // OpenAI
  OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
  OPENAI_MODEL: (() => {
    const modelStr = Deno.env.get('OPENAI_MODEL') || 'gpt-4';
    if (modelStr.startsWith('[') && modelStr.endsWith(']')) {
      return modelStr.slice(1, -1).split(',').map(m => m.trim());
    }
    return modelStr;
  })(),
  
// Google
  GOOGLE_API_KEY: Deno.env.get('GOOGLE_API_KEY'),
  GOOGLE_MODEL: (() => {
    const modelStr = Deno.env.get('GOOGLE_MODEL');
    if (!modelStr) return 'gemini-pro';
    // אם יש סוגריים מרובעים, מפרסר כמערך
    if (modelStr.startsWith('[') && modelStr.endsWith(']')) {
      return modelStr.slice(1, -1).split(',').map(m => m.trim());
    }
    return modelStr;
  })(),
  MODEL_RETRIES: parseInt(Deno.env.get('MODEL_RETRIES') || '1'),
  
  // Anthropic
  ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY'),
  ANTHROPIC_MODEL: (() => {
    const modelStr = Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-opus-20240229';
    if (modelStr.startsWith('[') && modelStr.endsWith(']')) {
      return modelStr.slice(1, -1).split(',').map(m => m.trim());
    }
    return modelStr;
  })(),
  
  // DeepSeek
  DEEPSEEK_BASE_URL: Deno.env.get('DEEPSEEK_BASE_URL'),
  DEEPSEEK_API_KEY: Deno.env.get('DEEPSEEK_API_KEY'),
  DEEPSEEK_MODEL: (() => {
    const modelStr = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-ai/DeepSeek-R1';
    if (modelStr.startsWith('[') && modelStr.endsWith(']')) {
      return modelStr.slice(1, -1).split(',').map(m => m.trim());
    }
    return modelStr;
  })(),
  
  // Ollama
  OLLAMA_BASE_URL: Deno.env.get('OLLAMA_BASE_URL') || 'http://localhost:11434/v1',
  OLLAMA_MODEL: (() => {
    const modelStr = Deno.env.get('OLLAMA_MODEL') || 'mistral';
    if (modelStr.startsWith('[') && modelStr.endsWith(']')) {
      return modelStr.slice(1, -1).split(',').map(m => m.trim());
    }
    return modelStr;
  })(),
  
  // LM Studio
  LM_STUDIO_BASE_URL: Deno.env.get('LM_STUDIO_BASE_URL') || 'http://localhost:1234/v1',
  LM_STUDIO_API_KEY: Deno.env.get('LM_STUDIO_API_KEY'),
  LM_STUDIO_MODEL: (() => {
    const modelStr = Deno.env.get('LM_STUDIO_MODEL') || 'gemini-2.0-flash-exp';
    if (modelStr.startsWith('[') && modelStr.endsWith(']')) {
      return modelStr.slice(1, -1).split(',').map(m => m.trim());
    }
    return modelStr;
  })(),
};

// Debug configuration
console.log('Configuration loaded:', {
  provider: CONFIG.AI_PROVIDER 
});
