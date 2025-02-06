export function logError(prefix: string, error: unknown, ...additionalInfo: unknown[]): void {
  console.error(prefix, {
    message: error instanceof Error ? error.message : String(error),
    type: error instanceof Error ? error.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined,
    ...(additionalInfo.length > 0 && { additionalInfo })
  });
}

export function logRequest(provider: string, request: unknown): void {
  console.log(`${provider} request:`, {
    timestamp: new Date().toISOString(),
    request
  });
}

export function logResponse(provider: string, response: unknown): void {
  console.log(`${provider} response:`, {
    timestamp: new Date().toISOString(),
    response
  });
}

export function logDebug(provider: string, message: string, data?: unknown): void {
  if (data !== undefined) {
    console.log(`[${provider}] ${message}`, data);
  } else {
    console.log(`[${provider}] ${message}`);
  }
}