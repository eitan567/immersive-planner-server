import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class GoogleAIProvider implements AIProvider {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'gemini-pro', timeout = 180000 } = config;
    
    if (!apiKey) throw new Error('Google API key is required');
    
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;

    logDebug('GoogleAI', 'Initialized with config:', { model, timeout });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('GoogleAI', 'Generating completion for prompt:', prompt);

    const formattedPrompt = `You are a helpful assistant with expertise in education and lesson planning.
You must ALWAYS respond in Hebrew.
Here is the task:

${prompt}`;

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

    try {
      logRequest('GoogleAI', requestBody);

      const response = await makeRequest(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          body: requestBody,
          timeout: this.timeout
        }
      );

      if (!response.ok) {
        const error = await response.json();
        logError('GoogleAI API error:', error);
        throw new Error(`Google AI API error: ${error.error?.message || JSON.stringify(error)}`);
      }

      const data = await response.json();
      logResponse('GoogleAI', data);

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        logError('GoogleAI invalid response format:', data);
        throw new Error('Invalid response structure from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      logError('GoogleAI completion error:', error);
      throw error;
    }
  }
}