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
