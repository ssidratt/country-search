import { describe, expect, it } from "vitest";
import { mapCountryResponse, type ApiCountry } from "./mapCountryResponse";

describe("mapCountryResponse with incomplete API data", () => {
  it("keeps zero values instead of treating them as missing", () => {
    const country = mapCountryResponse({
      name: "Example",
      population: 0,
      area: 0,
    });
    expect(country.population).toBe(0);
    expect(country.area).toBe(0);
  });

  it("represents missing numeric values as null", () => {
    const country = mapCountryResponse({ name: "Example" });
    expect(country.population).toBeNull();
    expect(country.area).toBeNull();
  });

  it("handles missing flag, languages, currencies, and other fields", () => {
    const country = mapCountryResponse({ name: "Example" });
    expect(country.flag).toBe("");
    expect(country.languages).toEqual([]);
    expect(country.currencies).toEqual([]);
    expect(country.timezones).toEqual([]);
    expect(country.borders).toEqual([]);
    expect(country.capital).toBe("");
  });

  it("handles null and malformed nested values", () => {
    const raw = {
      name: "Example",
      flags: null,
      languages: [null, {}, { name: "English" }, { name: null }],
      currencies: [{ name: "Euro" }, null],
      timezones: ["UTC", null, 1],
    } as unknown as ApiCountry;
    const country = mapCountryResponse(raw);
    expect(country.languages).toEqual(["English"]);
    expect(country.currencies).toEqual(["Euro"]);
    expect(country.timezones).toEqual(["UTC"]);
  });

  it("does not modify the API response", () => {
    const raw: ApiCountry = {
      name: "Example",
      languages: [{ name: "English" }],
    };
    const original = structuredClone(raw);
    mapCountryResponse(raw);
    expect(raw).toEqual(original);
  });
});
