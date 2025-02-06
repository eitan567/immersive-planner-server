import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class LMStudioProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    const { baseUrl, model, timeout = 280000 } = config;
    
    if (!baseUrl) throw new Error('LM Studio base URL is required');
    if (!model) throw new Error('LM Studio model name is required');
    
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeout = timeout;

    logDebug('LMStudio', 'Initialized with config:', { baseUrl, model, timeout });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('LMStudio', 'Starting completion generation...');
    logDebug('LMStudio', 'Prompt:', prompt);

    const requestBody = {
      model: this.model,
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

    try {
      logDebug('LMStudio', 'Sending request...', {
        url: `${this.baseUrl}/v1/chat/completions`,
        model: this.model
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
        throw new Error(`LM Studio API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      logResponse('LMStudio', data);

      if (!data.choices?.[0]?.message?.content) {
        logError('LMStudio', 'Invalid response format:', data);
        throw new Error('Invalid response format from LM Studio');
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
      throw error;
    }
  }
}