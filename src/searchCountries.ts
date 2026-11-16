const API_URL = "https://countries.dev/name/";

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

  const response = await fetch(url, { signal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return response.json();
}
