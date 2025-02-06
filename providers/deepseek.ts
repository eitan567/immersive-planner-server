import { AIProvider, ProviderConfig } from './types.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';
import OpenAI from 'openai';

export class DeepSeekProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    const { baseUrl, apiKey, model = 'klusterai/Meta-Llama-3.1-8B-Instruct-Turbo' } = config;
    
    if (!baseUrl) throw new Error('DeepSeek base URL is required');
    if (!apiKey) throw new Error('DeepSeek API key is required');
    
    this.client = new OpenAI({ 
      apiKey,
      baseURL: baseUrl
    });
    this.model = model;

    logDebug('DeepSeek', 'Initialized with config:', { baseUrl, model });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('DeepSeek', 'Generating completion for prompt:', prompt);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant with expertise in education and lesson planning. Respond in Hebrew.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    try {
      logRequest('DeepSeek', { model: this.model, messages });

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
        stream: false
      });
      
      logResponse('DeepSeek', completion);

      if (!completion.choices?.[0]?.message?.content) {
        logError('DeepSeek invalid response format:', completion);
        throw new Error('Invalid response format from DeepSeek API');
      }

      return completion.choices[0].message.content;
    } catch (error) {
      logError('DeepSeek completion error:', error);
      throw error;
    }
  }
}