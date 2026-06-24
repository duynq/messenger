export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ActionState = {
  error?: string;
  errorKey?: string;
  success?: boolean;
  successKey?: string;
};

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.error === 'string') return data.error;
    if (data.status?.message) return data.status.message;
    if (data.errors) {
      const values = Object.values(data.errors).flat();
      if (values.length > 0) return values.join(', ');
    }
  } catch {
    // response body is not JSON
  }
  return `Request failed (${response.status})`;
}

export async function throwIfNotOk(response: Response): Promise<Response> {
  if (!response.ok) {
    const message = await parseApiError(response);
    throw new ApiError(message, response.status);
  }
  return response;
}
