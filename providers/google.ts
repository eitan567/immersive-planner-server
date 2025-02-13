import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class GoogleAIProvider implements AIProvider {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly apiKey: string;
  private readonly models: string[];
  private readonly timeout: number;
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'gemini-pro', timeout = 180000, modelRetries = 1 } = config;
    
    if (!apiKey) throw new Error('Google API key is required');
    
    this.apiKey = apiKey;
    this.models = Array.isArray(model) ? model : [model];
    this.timeout = timeout;
    this.modelRetries = modelRetries;

    logDebug('GoogleAI', 'Initialized with config:', { models: this.models, timeout, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('GoogleAI', 'Generating completion for prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('GoogleAI', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('GoogleAI', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          const formattedPrompt = `You are a helpful assistant with expertise in education and lesson planning.
You must ALWAYS respond in Hebrew.
Here is the task:

${prompt}`;

          logDebug('GoogleAI', `Attempting with model ${currentModel} (Retry ${retry + 1}/${this.modelRetries})`);
          const requestBody = {
            contents: [{
              role: 'user',
              parts: [{
                text: formattedPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          };

          logRequest('GoogleAI', requestBody);

          const response = await makeRequest(
            `${this.baseUrl}/models/${currentModel}:generateContent?key=${this.apiKey}`,
            {
              body: requestBody,
              timeout: this.timeout
            }
          );

          if (!response.ok) {
            const error = await response.json();
            logError('GoogleAI API error:', error);
            lastError = new Error(`Google AI API error: ${error.error?.message || JSON.stringify(error)}`);
            logError('GoogleAI', `מודל ${currentModel} נכשל, עובר למודל הבא`);
            continue;
          }

          const data = await response.json();
          logResponse('GoogleAI', data);

          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            logError('GoogleAI invalid response format:', data);
            lastError = new Error('Invalid response structure from Gemini API');
            logError('GoogleAI', `מודל ${currentModel} החזיר מבנה לא תקין, עובר למודל הבא`);
            continue;
          }

          return data.candidates[0].content.parts[0].text;
        } catch (error) {
          logError('GoogleAI completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('GoogleAI', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
