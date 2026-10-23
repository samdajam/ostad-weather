const LOCATION_PATTERN = /^[\p{L}][\p{L}\p{M}\s.'’-]*[\p{L}\p{M}.]$/u;
const MIN_LENGTH = 2;
const MAX_LENGTH = 60;

const COUNTRY_ALIASES = ["usa", "us", "uk", "uae", "britain", "great britain", "england", "scotland", "wales", "holland", "america"];

let countryNames: Set<string> | null = null;

function normalize(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function getCountryNames() {
  if (countryNames) return countryNames;
  const names = new Set<string>(COUNTRY_ALIASES);
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const first of letters) {
      for (const second of letters) {
        const code = `${first}${second}`;
        const name = displayNames.of(code);
        if (name && name !== code) names.add(normalize(name));
      }
    }
  } catch {
    // Intl.DisplayNames unsupported; city lookup still covers country names.
  }
  countryNames = names;
  return names;
}

async function isKnownCity(name: string) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Geocoding lookup failed (${response.status})`);
  const data = (await response.json()) as { results?: unknown[] };
  return Array.isArray(data.results) && data.results.length > 0;
}

export type LocationValidationResult = { valid: true } | { valid: false; message: string };

export function validateLocationFormat(input: unknown): LocationValidationResult {
  if (typeof input !== "string") return { valid: false, message: "Please enter text only — a city or country name." };
  const value = input.trim();
  if (!value) return { valid: false, message: "Please enter a city or country name." };
  if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
    return { valid: false, message: `Location names must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.` };
  }
  if (/\d/.test(value)) return { valid: false, message: "Numbers aren’t allowed. Please enter a city or country name." };
  if (!LOCATION_PATTERN.test(value)) {
    return { valid: false, message: "Only letters, spaces, hyphens, apostrophes and periods are allowed." };
  }
  return { valid: true };
}

export async function validateLocation(input: unknown): Promise<LocationValidationResult> {
  const formatResult = validateLocationFormat(input);
  if (!formatResult.valid) return formatResult;

  const value = (input as string).trim();
  if (getCountryNames().has(normalize(value))) return { valid: true };

  try {
    if (await isKnownCity(value)) return { valid: true };
  } catch {
    // If the lookup service is unreachable, don't block searches that passed the format check.
    return { valid: true };
  }
  return { valid: false, message: `“${value}” doesn’t look like a real city or country. Please check the spelling.` };
}
