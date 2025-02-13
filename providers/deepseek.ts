import { AIProvider, ProviderConfig } from './types.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';
import OpenAI from 'openai';

export class DeepSeekProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly models: string[];
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { baseUrl, apiKey, model = 'klusterai/Meta-Llama-3.1-8B-Instruct-Turbo', modelRetries = 1 } = config;
    
    if (!baseUrl) throw new Error('DeepSeek base URL is required');
    if (!apiKey) throw new Error('DeepSeek API key is required');
    
    this.client = new OpenAI({ 
      apiKey,
      baseURL: baseUrl
    });
    this.models = Array.isArray(model) ? model : [model];
    this.modelRetries = modelRetries;

    logDebug('DeepSeek', 'Initialized with config:', { models: this.models, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('DeepSeek', 'Generating completion for prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('DeepSeek', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('DeepSeek', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
              role: 'system' as const,
              content: 'You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew.'
            },
            {
              role: 'user' as const,
              content: prompt
            }
          ];

          logRequest('DeepSeek', { model: currentModel, messages });

          const completion = await this.client.chat.completions.create({
            model: currentModel,
            messages,
            temperature: 0.7,
            max_tokens: 800,
            stream: false
          });
          
          logResponse('DeepSeek', completion);

          if (!completion.choices?.[0]?.message?.content) {
            logError('DeepSeek invalid response format:', completion);
            lastError = new Error('Invalid response format from DeepSeek API');
            logError('DeepSeek', `מודל ${currentModel} החזיר מבנה לא תקין, עובר למודל הבא`);
            continue;
          }

          return completion.choices[0].message.content;
        } catch (error) {
          logError('DeepSeek completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('DeepSeek', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
