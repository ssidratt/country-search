const API_URL = "https://countries.dev/name/";
const REQUEST_TIMEOUT = 10000;

export class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP error: ${status}`);
    this.name = "HttpError";
  }
}

export async function searchCountries(
  query: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = `${API_URL}${encodeURIComponent(query)}`;

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, REQUEST_TIMEOUT);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(url, {
      signal: combinedSignal,
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new HttpError(response.status);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
