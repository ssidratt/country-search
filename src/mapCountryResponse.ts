export interface Country {
  name: string;
  capital: string;
  region: string;
  population: number | null;
  area: number | null;
  flag: string;
  languages: string[];
  currencies: string[];
  subregion: string;
  demonym: string;
  timezones: string[];
  borders: string[];
  description: string;
}

interface ApiLanguage {
  name?: string | null;
}
interface ApiCurrency {
  name?: string | null;
}

export interface ApiCountry {
  name?: string | null;
  capital?: string | null;
  region?: string | null;
  population?: number | null;
  area?: number | null;
  flags?: { png?: string | null; svg?: string | null } | null;
  languages?: ApiLanguage[] | null;
  currencies?: ApiCurrency[] | null;
  subregion?: string | null;
  demonym?: string | null;
  timezones?: string[] | null;
  borders?: string[] | null;
  description?: string | null;
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function safeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (item === null || typeof item !== "object") return [];
    const name = (item as { name?: unknown }).name;
    return typeof name === "string" && name.trim() ? [name] : [];
  });
}

export function mapCountryResponse(raw: ApiCountry): Country {
  return {
    name: safeText(raw.name),
    capital: safeText(raw.capital),
    region: safeText(raw.region),
    population: safeNumber(raw.population),
    area: safeNumber(raw.area),
    flag: safeText(raw.flags?.png) || safeText(raw.flags?.svg),
    languages: safeNames(raw.languages),
    currencies: safeNames(raw.currencies),
    subregion: safeText(raw.subregion),
    demonym: safeText(raw.demonym),
    timezones: safeStrings(raw.timezones),
    borders: safeStrings(raw.borders),
    description: safeText(raw.description),
  };
}
