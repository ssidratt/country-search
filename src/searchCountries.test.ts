import { afterEach, describe, expect, it, vi } from "vitest";
import { searchCountries } from "./searchCountries";

describe("searchCountries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a request with the country name", async () => {
    const countries = [{ name: "Japan" }];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => countries,
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await searchCountries("Japan");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://countries.dev/name/Japan",
      expect.any(Object),
    );

    expect(result).toEqual(countries);
  });

  it("encodes the search query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchCountries("United States");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://countries.dev/name/United%20States",
      expect.any(Object),
    );
  });

  it("returns an empty array for HTTP 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const result = await searchCountries("UnknownCountry");

    expect(result).toEqual([]);
  });

  it("passes the abort signal to fetch", async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchCountries("Japan", controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://countries.dev/name/Japan",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe("country search errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws HttpError for HTTP 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(searchCountries("Japan")).rejects.toMatchObject({
      name: "HttpError",
      status: 500,
    });
  });

  it("returns no results for HTTP 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    await expect(searchCountries("Unknown")).resolves.toEqual([]);
  });

  it("propagates AbortError", async () => {
    const controller = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () => {
              reject(options.signal?.reason);
            });
          }),
      ),
    );

    const request = searchCountries("Japan", controller.signal);

    controller.abort();

    await expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("propagates TimeoutError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("Request timed out", "TimeoutError"),
        ),
    );

    await expect(searchCountries("Japan")).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });
});

describe("automatic request timeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("aborts a request when the timeout expires", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(options.signal?.reason);
          });
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const request = searchCountries("Japan");

    const expectation = expect(request).rejects.toMatchObject({
      name: "TimeoutError",
    });

    await vi.advanceTimersByTimeAsync(10000);

    await expectation;
  });
});
