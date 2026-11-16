export interface Country {
  name: string;
  capital: string;
  region: string;
  population: number;
  area: number;
  flag: string;
  languages: string[];
  currencies: string[];
}

interface ApiLanguage {
  name: string;
}

interface ApiCurrency {
  name: string;
}

export interface ApiCountry {
  name: string;
  capital: string;
  region: string;
  population: number;
  area: number;
  flags: {
    png: string;
    svg?: string;
  };
  languages: ApiLanguage[];
  currencies: ApiCurrency[];
}

export function mapCountryResponse(raw: ApiCountry): Country {
  return {
    name: raw.name,
    capital: raw.capital,
    region: raw.region,
    population: raw.population,
    area: raw.area,
    flag: raw.flags.png,
    languages: raw.languages.map((language) => language.name),
    currencies: raw.currencies.map((currency) => currency.name),
  };
}
