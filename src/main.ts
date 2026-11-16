import { debounce } from "./debounce.js";
import { searchCountries } from "./searchCountries.js";
import {
  mapCountryResponse,
  type ApiCountry,
  type Country,
} from "./mapCountryResponse.js";
import { toggleSound, playSound } from "./effects.js";
import { createGlobe } from "./globe.js";

const app = document.createElement("main");
app.className = "container";

const heading = document.createElement("div");
heading.className = "heading";

const globe = createGlobe();

const title = document.createElement("h1");
title.textContent = "Country Search";

heading.append(globe, title);

const subtitle = document.createElement("p");
subtitle.className = "subtitle";
subtitle.textContent = "Открой для себя страны мира";

const toolbar = document.createElement("div");
toolbar.className = "toolbar";

const themeButton = document.createElement("button");
themeButton.className = "toolbar-button";
themeButton.type = "button";
themeButton.textContent = "☀️ Светлая тема";

themeButton.addEventListener("click", () => {
  const light = document.body.classList.toggle("light-theme");

  themeButton.textContent = light ? "🌙 Тёмная тема" : "☀️ Светлая тема";

  playSound("click");
});

const soundButton = document.createElement("button");
soundButton.className = "toolbar-button";
soundButton.type = "button";
soundButton.textContent = "🔇 Звук выключен";
soundButton.setAttribute("aria-pressed", "false");

soundButton.addEventListener("click", () => {
  const enabled = toggleSound();

  soundButton.textContent = enabled ? "🔊 Звук включён" : "🔇 Звук выключен";

  soundButton.setAttribute("aria-pressed", String(enabled));

  playSound("click");
});

toolbar.append(themeButton, soundButton);

const input = document.createElement("input");
input.className = "search";
input.type = "search";
input.placeholder = "Введите название страны на английском...";
input.setAttribute("aria-label", "Поиск страны");

const sort = document.createElement("select");
sort.className = "sort";
sort.setAttribute("aria-label", "Сортировка стран");

const sortOptions = [
  { value: "name", label: "По названию" },
  { value: "population-desc", label: "Население: больше сначала" },
  { value: "population-asc", label: "Население: меньше сначала" },
];

for (const option of sortOptions) {
  const element = document.createElement("option");
  element.value = option.value;
  element.textContent = option.label;
  sort.append(element);
}

const status = document.createElement("p");
status.className = "status";
status.setAttribute("role", "status");

const results = document.createElement("div");
results.className = "results";

app.append(heading, subtitle, toolbar, input, sort, status, results);
document.body.append(app);

let activeController: AbortController | null = null;
let lastQuery = "";
let requestVersion = 0;
let currentCountries: Country[] = [];

function clearResults(): void {
  results.replaceChildren();
}

function showError(message: string): void {
  playSound("error");
  clearResults();
  status.textContent = message;

  const retry = document.createElement("button");
  retry.className = "retry";
  retry.textContent = "Повторить";

  retry.addEventListener("click", () => {
    playSound("click");
    void startSearch(lastQuery);
  });

  results.append(retry);
}

function sortCountries(countries: Country[]): Country[] {
  const sorted = [...countries];

  if (sort.value === "population-desc") {
    sorted.sort((a, b) => b.population - a.population);
  } else if (sort.value === "population-asc") {
    sorted.sort((a, b) => a.population - b.population);
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sorted;
}

function createDetail(country: Country): HTMLElement {
  const detail = document.createElement("section");
  detail.className = "card detail";

  const heading = document.createElement("h2");
  heading.textContent = country.name;

  const flag = document.createElement("img");
  flag.className = "flag";
  flag.src = country.flag;
  flag.alt = `Флаг страны ${country.name}`;

  const capital = document.createElement("p");
  capital.textContent = `Столица: ${country.capital || "Нет данных"}`;

  const region = document.createElement("p");
  region.textContent = `Регион: ${country.region}`;

  const population = document.createElement("p");
  population.textContent = `Население: ${country.population.toLocaleString("ru-RU")}`;

  const area = document.createElement("p");
  area.textContent = `Площадь: ${country.area.toLocaleString("ru-RU")} км²`;

  const languages = document.createElement("p");
  languages.textContent = `Языки: ${country.languages.join(", ") || "Нет данных"}`;

  const currencies = document.createElement("p");
  currencies.textContent = `Валюты: ${country.currencies.join(", ") || "Нет данных"}`;

  const back = document.createElement("button");
  back.className = "retry";
  back.textContent = "← Назад к результатам";

  back.addEventListener("click", () => {
    playSound("click");
    renderCountries(currentCountries);
  });

  detail.append(
    flag,
    heading,
    capital,
    region,
    population,
    area,
    languages,
    currencies,
    back,
  );

  return detail;
}

function renderCountries(countries: Country[]): void {
  clearResults();

  if (countries.length === 0) {
    status.textContent = "Ничего не найдено";
    return;
  }

  status.textContent = `Найдено стран: ${countries.length}`;

  const sorted = sortCountries(countries);

  for (const country of sorted) {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";

    const flag = document.createElement("img");
    flag.className = "flag";
    flag.src = country.flag;
    flag.alt = `Флаг страны ${country.name}`;
    flag.loading = "lazy";

    const name = document.createElement("h2");
    name.textContent = country.name;

    const capital = document.createElement("p");
    capital.textContent = `Столица: ${country.capital || "Нет данных"}`;

    const region = document.createElement("p");
    region.textContent = `Регион: ${country.region}`;

    const population = document.createElement("p");
    population.textContent = `Население: ${country.population.toLocaleString("ru-RU")}`;

    card.append(flag, name, capital, region, population);

    card.addEventListener("click", () => {
      playSound("click");
      clearResults();
      status.textContent = "Информация о стране";
      results.append(createDetail(country));
    });

    results.append(card);
  }
}

sort.addEventListener("change", () => {
  playSound("click");

  if (currentCountries.length > 0) {
    renderCountries(currentCountries);
  }
});

async function startSearch(query: string): Promise<void> {
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;

  const version = ++requestVersion;

  lastQuery = query;
  clearResults();

  if (!query) {
    status.textContent = "";
    currentCountries = [];
    activeController = null;
    return;
  }

  status.textContent = "Загрузка...";

  try {
    const response = await searchCountries(query, controller.signal);

    if (controller.signal.aborted || version !== requestVersion) {
      return;
    }

    if (!Array.isArray(response)) {
      throw new Error("Некорректный ответ сервера");
    }

    currentCountries = response.map((country: ApiCountry) =>
      mapCountryResponse(country),
    );

    renderCountries(currentCountries);

    if (currentCountries.length > 0) {
      playSound("success");
    }
  } catch (error: unknown) {
    if (controller.signal.aborted || version !== requestVersion) {
      return;
    }

    if (error instanceof Error && error.name === "AbortError") {
      return;
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      showError("Сервер слишком долго отвечает");
      return;
    }

    showError("Не удалось загрузить страны. Попробуйте ещё раз.");
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
  }
}

const delayedSearch = debounce((query: string) => {
  if (query !== input.value.trim()) {
    return;
  }

  void startSearch(query);
}, 350);

input.addEventListener("input", () => {
  const query = input.value.trim();

  activeController?.abort();
  ++requestVersion;
  clearResults();
  status.textContent = "";
  currentCountries = [];

  lastQuery = query;

  if (!query) {
    return;
  }

  delayedSearch(query);
});
