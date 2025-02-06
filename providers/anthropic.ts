import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class AnthropicProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'claude-3-opus-20240229', timeout = 180000 } = config;
    
    if (!apiKey) throw new Error('Anthropic API key is required');
    
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;

    logDebug('Anthropic', 'Initialized with config:', { model, timeout });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('Anthropic', 'Generating completion for prompt:', prompt);

    const requestBody = {
      model: this.model,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: 'You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew.'
    };

    try {
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
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      logResponse('Anthropic', data);

      return data.content?.[0]?.text || '';
    } catch (error) {
      logError('Anthropic completion error:', error);
      throw error;
    }
  }
}