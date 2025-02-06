export interface AIProvider {
    generateCompletion(prompt: string): Promise<string>;
  }
  
  export interface ProviderConfig {
    timeout?: number;
    baseUrl?: string;
    apiKey?: string;
    model?: string;
  }
  
  export const DEFAULT_TIMEOUT = 180000; // 3 minutes