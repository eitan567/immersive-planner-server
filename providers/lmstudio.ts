import { AIProvider, ProviderConfig } from './types';
import { makeRequest } from '../utils/http';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging';

export class LMStudioProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly models: string[];
  private readonly timeout: number;
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { baseUrl, model, timeout = 280000, modelRetries = 1 } = config;
    
    if (!baseUrl) throw new Error('LM Studio base URL is required');
    if (!model) throw new Error('LM Studio model name is required');
    
    this.baseUrl = baseUrl;
    this.models = Array.isArray(model) ? model : [model];
    this.timeout = timeout;
    this.modelRetries = modelRetries;

    logDebug('LMStudio', 'Initialized with config:', { baseUrl, models: this.models, timeout, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('LMStudio', 'Starting completion generation...');
    logDebug('LMStudio', 'Prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('LMStudio', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('LMStudio', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          const requestBody = {
            model: currentModel,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew. Make sure to maintain proper spacing between words and use proper line breaks for readability."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: -1,
      stream: false
    };

          logDebug('LMStudio', 'Sending request...', {
            url: `${this.baseUrl}/v1/chat/completions`,
            model: currentModel
          });
          
          logRequest('LMStudio', requestBody);

          const response = await makeRequest(`${this.baseUrl}/v1/chat/completions`, {
            body: requestBody,
            timeout: this.timeout
          });

          logDebug('LMStudio', 'Received response:', {
            status: response.status,
            ok: response.ok
          });

          if (!response.ok) {
            const errorText = await response.text();
            logError('LMStudio', 'API error:', {
              status: response.status,
              error: errorText
            });
            lastError = new Error(`LM Studio API error (${response.status}): ${errorText}`);
            logError('LMStudio', `מודל ${currentModel} נכשל, עובר למודל הבא`);
            continue;
          }

          const data = await response.json();
          logResponse('LMStudio', data);

          if (!data.choices?.[0]?.message?.content) {
            logError('LMStudio', 'Invalid response format:', data);
            lastError = new Error('Invalid response format from LM Studio');
            logError('LMStudio', `מודל ${currentModel} החזיר מבנה לא תקין, עובר למודל הבא`);
            continue;
          }

          // Process the response text to ensure proper spacing
          let text = data.choices[0].message.content;
          
          // Fix common formatting issues
          text = text
            // Remove excess whitespace
            .replace(/\s+/g, ' ')
            // Ensure proper spacing after punctuation
            .replace(/([.!?])\s*/g, '$1 ')
            // Fix spacing around parentheses
            .replace(/\(\s*/g, '(')
            .replace(/\s*\)/g, ')')
            // Fix Hebrew punctuation spacing
            .replace(/([,;:])\s*/g, '$1 ')
            // Maintain proper line breaks
            .replace(/\n\s*/g, '\n')
            .trim();

          logDebug('LMStudio', 'Processed text:', text);
          return text;
        } catch (error) {
          logError('LMStudio', 'Completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('LMStudio', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
