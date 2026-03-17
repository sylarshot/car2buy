import type { BodyType, Fuel, Listing, Transmission } from "@/lib/types";

type CsvParseResult =
  | { ok: true; listings: Listing[]; warnings: string[] }
  | { ok: false; error: string };

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

function parseFuel(s: string): Fuel | null {
  const v = norm(s);
  if (["petrol", "benzin", "gasoline"].includes(v)) return "petrol";
  if (["hybrid", "hibrid"].includes(v)) return "hybrid";
  if (["plugin_hybrid", "plug-in hybrid", "phev", "plug-in", "plug in"].includes(v))
    return "plugin_hybrid";
  if (["electric", "ev", "villany", "elektromos"].includes(v)) return "electric";
  return null;
}

function parseTransmission(s: string): Transmission | null {
  const v = norm(s);
  if (["manual", "man", "kézi", "kezi"].includes(v)) return "manual";
  if (["automatic", "auto", "automata"].includes(v)) return "automatic";
  if (["cvt"].includes(v)) return "cvt";
  if (["other"].includes(v)) return "other";
  return null;
}

function parseBody(s: string): BodyType | null {
  const v = norm(s);
  if (["hatchback", "hb", "ferdehátú", "ferdehatu"].includes(v)) return "hatchback";
  if (["sedan", "limousine", "limuzin"].includes(v)) return "sedan";
  if (["suv", "crossover"].includes(v)) return "suv";
  if (["coupe", "kupé", "kupe"].includes(v)) return "coupe";
  if (["convertible", "cabrio", "kabrió", "kabrio"].includes(v)) return "convertible";
  return null;
}

function toInt(s: string) {
  const cleaned = s.replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseListingsCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter((l) => l.length);
  if (!lines.length) return { ok: false, error: "CSV is empty." };

  const header = splitCsvLine(lines[0]).map(norm);
  const idx = (name: string) => header.indexOf(norm(name));

  const required = [
    "id",
    "title",
    "priceHuf",
    "year",
    "mileageKm",
    "fuel",
    "transmission",
    "body",
  ];
  for (const r of required) {
    if (idx(r) === -1) {
      return {
        ok: false,
        error:
          `Missing required column "${r}". Required columns: ` +
          required.join(", "),
      };
    }
  }

  const warnings: string[] = [];
  const listings: Listing[] = [];

  for (let row = 1; row < lines.length; row++) {
    const cols = splitCsvLine(lines[row]);
    const get = (name: string) => cols[idx(name)] ?? "";

    const id = get("id");
    const title = get("title");
    const priceHuf = toInt(get("priceHuf"));
    const year = toInt(get("year"));
    const mileageKm = toInt(get("mileageKm"));
    const fuel = parseFuel(get("fuel"));
    const transmission = parseTransmission(get("transmission"));
    const body = parseBody(get("body"));

    if (
      !id ||
      !title ||
      priceHuf == null ||
      year == null ||
      mileageKm == null ||
      !fuel ||
      !transmission ||
      !body
    ) {
      warnings.push(`Row ${row + 1}: skipped (missing/invalid required fields).`);
      continue;
    }

    listings.push({
      id,
      title,
      make: get("make") || undefined,
      model: get("model") || undefined,
      priceHuf,
      year,
      mileageKm,
      fuel,
      transmission,
      body,
      location: get("location") || undefined,
      powerKw: toInt(get("powerKw") ?? "") ?? undefined,
      displacementCcm: toInt(get("displacementCcm") ?? "") ?? undefined,
      notes: get("notes") || undefined,
      url: get("url") || undefined,
      createdAt: get("createdAt") || undefined,
    });
  }

  if (!listings.length) {
    return { ok: false, error: "No valid rows found. Check your CSV format." };
  }

  return { ok: true, listings, warnings };
}

