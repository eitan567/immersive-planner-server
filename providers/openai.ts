import { AIProvider, ProviderConfig } from './types';
import { makeRequest } from '../utils/http';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging';

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly models: string[];
  private readonly timeout: number;
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'gpt-3.5-turbo', timeout = 180000, modelRetries = 1 } = config;
    
    if (!apiKey) throw new Error('OpenAI API key is required');
    
    this.apiKey = apiKey;
    this.models = Array.isArray(model) ? model : [model];
    this.timeout = timeout;
    this.modelRetries = modelRetries;

    logDebug('OpenAI', 'Initialized with config:', { models: this.models, timeout, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('OpenAI', 'Generating completion for prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('OpenAI', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('OpenAI', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          const requestBody = {
            model: currentModel,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only API that must return valid JSON responses in Hebrew. Never include any text outside the JSON structure. Ensure all strings are properly escaped and encoded.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    };

          logRequest('OpenAI', requestBody);

          const apiResponse = await makeRequest('https://api.openai.com/v1/chat/completions', {
            body: requestBody,
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: this.timeout
          });

          if (!apiResponse.ok) {
            const error = await apiResponse.json();
            logError('OpenAI API error:', error);
            lastError = new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
            logError('OpenAI', `מודל ${currentModel} נכשל, עובר למודל הבא`);
            continue;
          }

          const data = await apiResponse.json();
          logResponse('OpenAI', data);

          const content = data.choices?.[0]?.message?.content;
          try {
            if (!content) {
              logError('OpenAI error:', 'Empty response content');
              lastError = new Error('Empty response from OpenAI');
              logError('OpenAI', `מודל ${currentModel} החזיר תוכן ריק, עובר למודל הבא`);
              continue;
            }

            logDebug('OpenAI raw response:', content);

            // Try to parse and re-stringify to ensure valid JSON
            const trimmedContent = content.toString().trim();
            logDebug('OpenAI trimmed content:', trimmedContent);
            
            const parsed = JSON.parse(trimmedContent);
            logDebug('OpenAI parsed response:', parsed);

            // Validate required fields
            if (!parsed.fieldName || !parsed.value) {
              logError('OpenAI validation error:', 'Missing required fields');
              lastError = new Error('תשובת המערכת חסרה שדות חובה');
              logError('OpenAI', `מודל ${currentModel} החזיר מבנה לא תקין, עובר למודל הבא`);
              continue;
            }

            const formatted = JSON.stringify(parsed);
            logDebug('OpenAI formatted response:', formatted);
            
            return formatted;
          } catch (e) {
            logError('OpenAI JSON parsing error:', e);
            logError('OpenAI problematic content:', content || 'No content available');
            lastError = new Error('Invalid JSON response from AI');
            logError('OpenAI', `מודל ${currentModel} החזיר JSON לא תקין, עובר למודל הבא`);
            continue;
          }
        } catch (error) {
          logError('OpenAI completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('OpenAI', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
