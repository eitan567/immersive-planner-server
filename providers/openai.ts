import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'gpt-3.5-turbo', timeout = 180000 } = config;
    
    if (!apiKey) throw new Error('OpenAI API key is required');
    
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;

    logDebug('OpenAI', 'Initialized with config:', { model, timeout });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('OpenAI', 'Generating completion for prompt:', prompt);

    const requestBody = {
      model: this.model,
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

    try {
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
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await apiResponse.json();
      logResponse('OpenAI', data);

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        logError('OpenAI error:', 'Empty response content');
        throw new Error('Empty response from OpenAI');
      }

      logDebug('OpenAI raw response:', content);

      // Try to parse and re-stringify to ensure valid JSON
      try {
        const trimmedContent = content.toString().trim();
        logDebug('OpenAI trimmed content:', trimmedContent);
        
        const parsed = JSON.parse(trimmedContent);
        logDebug('OpenAI parsed response:', parsed);

        // Validate required fields
        if (!parsed.fieldName || !parsed.value) {
          logError('OpenAI validation error:', 'Missing required fields');
          throw new Error('תשובת המערכת חסרה שדות חובה');
        }

        const formatted = JSON.stringify(parsed);
        logDebug('OpenAI formatted response:', formatted);
        
        return formatted;
      } catch (e) {
        logError('OpenAI JSON parsing error:', e);
        logError('OpenAI problematic content:', content);
        throw new Error('Invalid JSON response from AI');
      }
    } catch (error) {
      logError('OpenAI completion error:', error);
      throw error;
    }
  }
}