import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    const { baseUrl = 'http://localhost:11434', model = 'mistral', timeout = 180000 } = config;
    
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeout = timeout;

    logDebug('Ollama', 'Initialized with config:', { baseUrl, model, timeout });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('Ollama', 'Generating completion for prompt:', prompt);

    const requestBody = {
      model: this.model,
      prompt: `System: You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew.

User: ${prompt}`,
      stream: false
    };

    try {
      logRequest('Ollama', requestBody);

      const response = await makeRequest(`${this.baseUrl}/api/generate`, {
        body: requestBody,
        timeout: this.timeout
      });

      if (!response.ok) {
        const error = await response.json();
        logError('Ollama API error:', error);
        throw new Error(`Ollama API error: ${error.error || JSON.stringify(error)}`);
      }

      const data = await response.json();
      logResponse('Ollama', data);

      return data.response || '';
    } catch (error) {
      logError('Ollama completion error:', error);
      throw error;
    }
  }
}