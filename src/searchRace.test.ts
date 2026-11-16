import { afterEach, describe, expect, it, vi } from "vitest";
import { searchCountries } from "./searchCountries";

describe("country search race condition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("aborts the previous request and keeps the latest result", async () => {
    const firstController = new AbortController();
    const secondController = new AbortController();

    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const query = decodeURIComponent(_url.split("/").pop() ?? "");

          const delay = query === "Japan" ? 100 : 10;

          const timer = setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => [{ name: query }],
            } as Response);
          }, delay);

          options.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Request aborted", "AbortError"));
            },
            { once: true },
          );
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = searchCountries("Japan", firstController.signal);

    const firstResult = expect(firstRequest).rejects.toMatchObject({
      name: "AbortError",
    });

    firstController.abort();

    const secondRequest = searchCountries("Germany", secondController.signal);

    await expect(secondRequest).resolves.toEqual([{ name: "Germany" }]);

    await firstResult;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
