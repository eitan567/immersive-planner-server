import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly models: string[];
  private readonly timeout: number;
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { baseUrl = 'http://localhost:11434', model = 'mistral', timeout = 180000, modelRetries = 1 } = config;
    
    this.baseUrl = baseUrl;
    this.models = Array.isArray(model) ? model : [model];
    this.timeout = timeout;
    this.modelRetries = modelRetries;

    logDebug('Ollama', 'Initialized with config:', { baseUrl, models: this.models, timeout, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('Ollama', 'Generating completion for prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('Ollama', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('Ollama', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          const requestBody = {
            model: currentModel,
      prompt: `System: You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew.

User: ${prompt}`,
      stream: false
    };

          logRequest('Ollama', requestBody);

          const response = await makeRequest(`${this.baseUrl}/api/generate`, {
            body: requestBody,
            timeout: this.timeout
          });

          if (!response.ok) {
            const error = await response.json();
            logError('Ollama API error:', error);
            lastError = new Error(`Ollama API error: ${error.error || JSON.stringify(error)}`);
            logError('Ollama', `מודל ${currentModel} נכשל, עובר למודל הבא`);
            continue;
          }

          const data = await response.json();
          logResponse('Ollama', data);

          if (!data.response) {
            logError('Ollama', 'Empty response:', data);
            lastError = new Error('Empty response from Ollama');
            logError('Ollama', `מודל ${currentModel} החזיר תשובה ריקה, עובר למודל הבא`);
            continue;
          }

          return data.response;
        } catch (error) {
          logError('Ollama completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('Ollama', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
