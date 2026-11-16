import { describe, expect, it } from "vitest";
import { mapCountryResponse } from "./mapCountryResponse";

describe("mapCountryResponse", () => {
  const apiResponse = {
    name: "Japan",
    capital: "Tokyo",
    region: "Asia",
    population: 125836021,
    area: 377930,
    flags: {
      png: "https://flagcdn.com/w320/jp.png",
      svg: "https://flagcdn.com/jp.svg",
    },
    languages: [
      {
        name: "Japanese",
        iso639_1: "ja",
      },
    ],
    currencies: [
      {
        code: "JPY",
        name: "Japanese yen",
        symbol: "¥",
      },
    ],
  };

  it("maps basic country information", () => {
    const result = mapCountryResponse(apiResponse);

    expect(result).toMatchObject({
      name: "Japan",
      capital: "Tokyo",
      region: "Asia",
      population: 125836021,
      area: 377930,
      flag: "https://flagcdn.com/w320/jp.png",
    });
  });

  it("maps languages to an array of names", () => {
    const result = mapCountryResponse(apiResponse);

    expect(result.languages).toEqual(["Japanese"]);
  });

  it("maps currencies to an array of names", () => {
    const result = mapCountryResponse(apiResponse);

    expect(result.currencies).toEqual(["Japanese yen"]);
  });

  it("does not modify the original API response", () => {
    const original = structuredClone(apiResponse);

    mapCountryResponse(apiResponse);

    expect(apiResponse).toEqual(original);
  });
});
