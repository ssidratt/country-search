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

const header = document.createElement("header");
header.className = "site-header";

const brand = document.createElement("div");
brand.className = "brand";
const globe = createGlobe();
const brandName = document.createElement("span");
brandName.className = "brand-name";
brandName.textContent = "Country Search";
brand.append(globe, brandName);

const toolbar = document.createElement("div");
toolbar.className = "toolbar";

function createIconButton(label: string, icon: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.title = label;
  button.setAttribute("aria-label", label);
  const symbol = document.createElement("span");
  symbol.className = "button-icon";
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = icon;
  button.append(symbol);
  return button;
}

const themeButton = createIconButton("Включить светлую тему", "☀");
themeButton.addEventListener("click", () => {
  const light = document.body.classList.toggle("light-theme");
  themeButton.firstElementChild!.textContent = light ? "☾" : "☀";
  const label = light ? "Включить тёмную тему" : "Включить светлую тему";
  themeButton.title = label;
  themeButton.setAttribute("aria-label", label);
  themeButton.setAttribute("aria-pressed", String(light));
  playSound("click");
});
themeButton.setAttribute("aria-pressed", "false");

let soundEnabled = false;
const soundButton = createIconButton("Включить звук", "♩");
soundButton.setAttribute("aria-pressed", "false");
soundButton.addEventListener("click", () => {
  soundEnabled = toggleSound();
  const label = soundEnabled ? "Выключить звук" : "Включить звук";
  soundButton.firstElementChild!.textContent = soundEnabled ? "♫" : "♩";
  soundButton.title = label;
  soundButton.setAttribute("aria-label", label);
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  playSound("click");
});
toolbar.append(themeButton, soundButton);
header.append(brand, toolbar);

const hero = document.createElement("section");
hero.className = "hero";
const title = document.createElement("h1");
title.textContent = "Открой для себя мир";
const subtitle = document.createElement("p");
subtitle.className = "subtitle";
subtitle.textContent = "Найди любую страну и узнай о ней больше";
hero.append(title, subtitle);

const searchWrapper = document.createElement("div");
searchWrapper.className = "search-wrapper";
const searchIcon = document.createElement("span");
searchIcon.className = "search-icon";
searchIcon.textContent = "⌕";
searchIcon.setAttribute("aria-hidden", "true");
const input = document.createElement("input");
input.className = "search";
input.type = "search";
input.placeholder = "Введите название страны на английском...";
input.setAttribute("aria-label", "Поиск страны");
input.setAttribute("role", "combobox");
input.setAttribute("aria-autocomplete", "list");
input.setAttribute("aria-expanded", "false");
input.setAttribute("aria-controls", "country-suggestions");
input.autocomplete = "off";
const suggestions = document.createElement("div");
suggestions.className = "suggestions";
suggestions.id = "country-suggestions";
suggestions.setAttribute("role", "listbox");
suggestions.hidden = true;
searchWrapper.append(searchIcon, input, suggestions);

const resultsHeader = document.createElement("div");
resultsHeader.className = "results-header";
const resultsTitle = document.createElement("h2");
resultsTitle.className = "results-title";
resultsTitle.textContent = "Результаты поиска";
const sort = document.createElement("select");
sort.className = "sort";
sort.setAttribute("aria-label", "Сортировка стран");
for (const option of [
  { value: "name", label: "По названию" },
  { value: "population-desc", label: "Население: больше сначала" },
  { value: "population-asc", label: "Население: меньше сначала" },
]) {
  const element = document.createElement("option");
  element.value = option.value;
  element.textContent = option.label;
  sort.append(element);
}
resultsHeader.append(resultsTitle, sort);
const status = document.createElement("p");
status.className = "status";
status.setAttribute("role", "status");
const results = document.createElement("div");
results.className = "results";
app.append(header, hero, searchWrapper, resultsHeader, status, results);
document.body.append(app);

let activeController: AbortController | null = null;
let lastQuery = "";
let requestVersion = 0;
let currentCountries: Country[] = [];
let suggestionCountries: Country[] = [];
let activeSuggestionIndex = -1;
let selectedCountry: Country | null = null;
let suggestionsDismissed = false;

function clearResults(): void {
  results.replaceChildren();
}

function closeSuggestions(): void {
  suggestions.replaceChildren();
  suggestions.hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  activeSuggestionIndex = -1;
  suggestionCountries = [];
}

function showError(message: string): void {
  playSound("error");
  clearResults();
  closeSuggestions();
  status.textContent = message;
  const retry = document.createElement("button");
  retry.className = "retry";
  retry.type = "button";
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
    sorted.sort((a, b) => (b.population ?? -1) - (a.population ?? -1));
  } else if (sort.value === "population-asc") {
    sorted.sort(
      (a, b) =>
        (a.population ?? Number.POSITIVE_INFINITY) -
        (b.population ?? Number.POSITIVE_INFINITY),
    );
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

function formatNumber(value: number | undefined | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("ru-RU")
    : "Нет данных";
}

function formatList(values: string[] | undefined | null): string {
  return Array.isArray(values) ? values.join(", ") : "";
}

function detailRow(label: string, value: string): HTMLParagraphElement {
  const row = document.createElement("p");
  const key = document.createElement("strong");
  key.textContent = `${label}: `;
  row.append(key, document.createTextNode(value || "Нет данных"));
  return row;
}

function createDetail(country: Country): HTMLElement {
  const detail = document.createElement("section");
  detail.className = "card detail";
  const flag = document.createElement("img");
  flag.className = "detail-flag";
  flag.src = country.flag;
  flag.hidden = !country.flag;
  flag.alt = `Флаг страны ${country.name}`;
  const heading = document.createElement("h2");
  heading.textContent = country.name;
  detail.append(
    flag,
    heading,
    detailRow("Столица", country.capital),
    detailRow("Регион", country.region),
    detailRow("Подрегион", country.subregion),
    detailRow("Население", formatNumber(country.population)),
    detailRow(
      "Площадь",
      typeof country.area === "number" && Number.isFinite(country.area)
        ? `${formatNumber(country.area)} км²`
        : "Нет данных",
    ),
    detailRow("Название жителей", country.demonym),
    detailRow("Языки", formatList(country.languages)),
    detailRow("Валюты", formatList(country.currencies)),
    detailRow("Часовые пояса", formatList(country.timezones)),
    detailRow("Соседние страны", formatList(country.borders)),
    detailRow("Описание", country.description),
  );
  const back = document.createElement("button");
  back.className = "retry";
  back.type = "button";
  back.textContent = "← Назад к результатам";
  back.addEventListener("click", () => {
    playSound("click");
    selectedCountry = null;
    renderCountries(currentCountries);
  });
  detail.append(back);
  return detail;
}

function openCountry(country: Country): void {
  activeController?.abort();
  ++requestVersion;
  selectedCountry = country;
  suggestionsDismissed = true;
  closeSuggestions();
  input.value = country.name;
  lastQuery = country.name;
  clearResults();
  status.textContent = "Информация о стране";
  results.append(createDetail(country));
  playSound("click");
}

function renderCountries(countries: Country[]): void {
  clearResults();
  if (countries.length === 0) {
    status.textContent = "Ничего не найдено";
    return;
  }
  status.textContent = `Найдено стран: ${countries.length}`;
  for (const country of sortCountries(countries)) {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    const flag = document.createElement("img");
    flag.className = "flag";
    flag.src = country.flag;
    flag.hidden = !country.flag;
    flag.alt = `Флаг страны ${country.name}`;
    flag.loading = "lazy";
    const name = document.createElement("h3");
    name.textContent = country.name;
    const capital = detailRow("Столица", country.capital);
    const region = detailRow("Регион", country.region);
    const population = detailRow("Население", formatNumber(country.population));
    card.append(flag, name, capital, region, population);
    card.addEventListener("click", () => openCountry(country));
    results.append(card);
  }
}

function setActiveSuggestion(index: number): void {
  const options = suggestions.querySelectorAll<HTMLElement>('[role="option"]');
  activeSuggestionIndex = index;
  options.forEach((option, optionIndex) => {
    const active = optionIndex === index;
    option.classList.toggle("active", active);
    option.setAttribute("aria-selected", String(active));
  });
  const activeOption = options[index];
  if (activeOption) {
    input.setAttribute("aria-activedescendant", activeOption.id);
    activeOption.scrollIntoView({ block: "nearest" });
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function renderSuggestions(countries: Country[]): void {
  closeSuggestions();
  if (countries.length === 0 || suggestionsDismissed) return;
  suggestionCountries = sortCountries(countries).slice(0, 8);
  suggestionCountries.forEach((country, index) => {
    const option = document.createElement("div");
    option.className = "suggestion-item";
    option.id = `country-option-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    const flag = document.createElement("img");
    flag.className = "suggestion-flag";
    flag.src = country.flag;
    flag.hidden = !country.flag;
    flag.alt = "";
    flag.loading = "lazy";
    const info = document.createElement("span");
    info.className = "suggestion-info";
    const name = document.createElement("strong");
    name.textContent = country.name;
    const capital = document.createElement("small");
    capital.textContent = `Столица: ${country.capital || "Нет данных"}`;
    info.append(name, capital);
    option.append(flag, info);
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => openCountry(country));
    suggestions.append(option);
  });
  suggestions.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

sort.addEventListener("change", () => {
  playSound("click");
  if (currentCountries.length > 0) {
    if (selectedCountry === null) renderCountries(currentCountries);
    if (!suggestions.hidden) renderSuggestions(currentCountries);
  }
});

async function startSearch(query: string): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const version = ++requestVersion;
  lastQuery = query;
  selectedCountry = null;
  suggestionsDismissed = false;
  clearResults();
  closeSuggestions();
  if (!query) {
    status.textContent = "";
    currentCountries = [];
    activeController = null;
    return;
  }
  status.textContent = "Загрузка...";
  try {
    const response = await searchCountries(query, controller.signal);
    if (controller.signal.aborted || version !== requestVersion) return;
    if (!Array.isArray(response)) {
      throw new Error("Некорректный ответ сервера");
    }
    currentCountries = response.map((country: ApiCountry) =>
      mapCountryResponse(country),
    );
    renderCountries(currentCountries);
    renderSuggestions(currentCountries);
    if (currentCountries.length > 0) playSound("success");
  } catch (error: unknown) {
    if (controller.signal.aborted || version !== requestVersion) return;
    if (error instanceof Error && error.name === "AbortError") return;
    if (error instanceof Error && error.name === "TimeoutError") {
      showError("Сервер слишком долго отвечает");
      return;
    }
    showError("Не удалось загрузить страны. Попробуйте ещё раз.");
  } finally {
    if (activeController === controller) activeController = null;
  }
}

const delayedSearch = debounce((query: string) => {
  if (query !== input.value.trim()) return;
  void startSearch(query);
}, 350);

input.addEventListener("input", () => {
  const query = input.value.trim();
  activeController?.abort();
  ++requestVersion;
  clearResults();
  closeSuggestions();
  status.textContent = "";
  currentCountries = [];
  selectedCountry = null;
  suggestionsDismissed = false;
  lastQuery = query;
  if (query) delayedSearch(query);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSuggestions();
    suggestionsDismissed = true;
    return;
  }
  if (suggestions.hidden || suggestionCountries.length === 0) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActiveSuggestion(
      (activeSuggestionIndex + 1) % suggestionCountries.length,
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveSuggestion(
      (activeSuggestionIndex - 1 + suggestionCountries.length) %
        suggestionCountries.length,
    );
  } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
    event.preventDefault();
    const country = suggestionCountries[activeSuggestionIndex];
    if (country) openCountry(country);
  }
});

input.addEventListener("focus", () => {
  if (
    currentCountries.length > 0 &&
    input.value.trim() === lastQuery &&
    !suggestionsDismissed
  ) {
    renderSuggestions(currentCountries);
  }
});

document.addEventListener("pointerdown", (event) => {
  if (event.target instanceof Node && !searchWrapper.contains(event.target)) {
    closeSuggestions();
    suggestionsDismissed = true;
  }
});
