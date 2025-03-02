import { AIProvider, ProviderConfig } from './types';
import { makeRequest } from '../utils/http';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging';

export class AnthropicProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly models: string[];
  private readonly timeout: number;
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'claude-3-opus-20240229', timeout = 180000, modelRetries = 1 } = config;
    
    if (!apiKey) throw new Error('Anthropic API key is required');
    
    this.apiKey = apiKey;
    this.models = Array.isArray(model) ? model : [model];
    this.timeout = timeout;
    this.modelRetries = modelRetries;

    logDebug('Anthropic', 'Initialized with config:', { models: this.models, timeout, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('Anthropic', 'Generating completion for prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('Anthropic', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('Anthropic', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          const requestBody = {
            model: currentModel,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: 'You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew.'
    };

          logRequest('Anthropic', requestBody);

          const response = await makeRequest('https://api.anthropic.com/v1/messages', {
            body: requestBody,
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01'
            },
            timeout: this.timeout
          });

          if (!response.ok) {
            const error = await response.json();
            logError('Anthropic API error:', error);
            lastError = new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
            logError('Anthropic', `מודל ${currentModel} נכשל, עובר למודל הבא`);
            continue;
          }

          const data = await response.json();
          logResponse('Anthropic', data);

          const content = data.content?.[0]?.text;
          if (!content) {
            logError('Anthropic error:', 'Empty response content');
            lastError = new Error('Empty response from Anthropic');
            logError('Anthropic', `מודל ${currentModel} החזיר תוכן ריק, עובר למודל הבא`);
            continue;
          }

          return content;
        } catch (error) {
          logError('Anthropic completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('Anthropic', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
