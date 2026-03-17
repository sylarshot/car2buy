import { NextResponse } from "next/server";
import type { Listing, Fuel, Transmission, BodyType } from "@/lib/types";

export type SearchParams = {
  budgetMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  fuels?: string[];
  transmissions?: string[];
  bodies?: string[];
  query?: string;
};

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml",
  "accept-language": "hu-HU,hu;q=0.9,en;q=0.8",
  "cache-control": "no-cache",
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function pickNum(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(/[^\d]/g, ""));
  return n > 0 ? n : undefined;
}

function mapFuel(s: string): Fuel {
  const l = s.toLowerCase();
  if (l.includes("elektromos") || l.includes("electric") || l.includes("bev")) return "electric";
  if (l.includes("plug") || l.includes("phev")) return "plugin_hybrid";
  if (l.includes("hibrid") || l.includes("hybrid")) return "hybrid";
  if (l.includes("dízel") || l.includes("diesel")) return "petrol"; // map diesel to petrol (no diesel type)
  return "petrol";
}

function mapTransmission(s: string): Transmission {
  const l = s.toLowerCase();
  if (l.includes("fokozatmentes") || l.includes("cvt")) return "cvt";
  if (l.includes("automata") || l.includes("automatic")) return "automatic";
  return "manual";
}

function mapBody(s: string): BodyType {
  const l = s.toLowerCase();
  if (l.includes("terepjáró") || l.includes("suv") || l.includes("crossover") || l.includes("cross")) return "suv";
  if (l.includes("ferdehátú") || l.includes("hatchback")) return "hatchback";
  if (l.includes("kupé") || l.includes("coupe") || l.includes("cabriolet") || l.includes("cabrio")) return "coupe";
  if (l.includes("kombi") || l.includes("sw") || l.includes("estate")) return "sedan";
  return "sedan";
}

// ── Emil Frey Select ─────────────────────────────────────────────────────────
// URL: https://emilfreyselect.hu/kiemelt-hasznaltauto-kinalatunk
// Listing class: col-md-4 col-xs-6 car-item inline-col
function parseEmilFrey(html: string, source: string): Listing[] {
  const listings: Listing[] = [];
  const cardRe = /class="[^"]*car-item[^"]*"([\s\S]*?)(?=class="[^"]*car-item[^"]*"|<footer|<\/section)/g;
  let m: RegExpExecArray | null;
  let id = 0;

  while ((m = cardRe.exec(html)) !== null) {
    const block = m[1];
    const urlM = block.match(/href="(https:\/\/emilfreyselect\.hu\/[^"]+)"/);
    const brandM = block.match(/class="brand"[^>]*>([\s\S]*?)<\/div>/);
    const titleM = block.match(/class="title"[^>]*>([\s\S]*?)<\/div>/);
    const imgM = block.match(/<img[^>]+src="([^"]+)"/);
    const priceM = block.match(/([\d][\d\s]{3,})\s*Ft/);
    const kmM = block.match(/([\d][\d\s]+)\s*km/i);
    const yearM = block.match(/icon-calendar[\s\S]{0,80}?(\b20\d{2})\b/);
    const fuelM = block.match(/icon-fuel[\s\S]{0,60}?\n\s+(.*?)\n/);
    const gearM = block.match(/icon-gearshift[\s\S]{0,60}?\n\s+(.*?)\n/);

    const url = urlM?.[1];
    const brand = brandM ? decodeHtml(stripTags(brandM[1])) : "";
    const title = titleM ? decodeHtml(stripTags(titleM[1])) : "";
    if (!url || !brand) continue;

    // Avoid duplicating brand in title (e.g. "TOYOTA YARIS YARIS 1.5...")
    const fullTitle = title.toUpperCase().startsWith(brand.toUpperCase())
      ? decodeHtml(stripTags(title))
      : title
      ? `${brand} ${title}`
      : brand;
    const make = brand.split(" ")[0];
    const model = brand.split(" ").slice(1).join(" ") || title.split(" ")[0];

    // Use title+fuelM for fuel (PHEV/Hibrid often only in title)
    const fuelRaw = (fuelM?.[1]?.trim() ?? "") + " " + fullTitle;
    const fuel = mapFuel(fuelRaw);
    const transmission = mapTransmission(gearM?.[1]?.trim() ?? "");

    // Body type heuristic from title
    const body = mapBody(fullTitle);

    id++;
    listings.push({
      id: `ef-${id}`,
      title: fullTitle,
      make,
      model,
      priceHuf: pickNum(priceM?.[1]) ?? 0,
      year: pickNum(yearM?.[1]) ?? 2020,
      mileageKm: pickNum(kmM?.[1]) ?? 0,
      fuel,
      transmission,
      body,
      url,
      imageUrl: imgM?.[1]?.startsWith("http") ? imgM[1] : undefined,
      notes: `Source: ${source}`,
    });
  }

  return listings;
}

// ── Toyota Kovács ─────────────────────────────────────────────────────────────
// URL: https://toyotakovacs.hu/auto-allapot/hasznaltauto/
// Listing class: car-card v2
function parseToyotaKovacs(html: string, source: string): Listing[] {
  const listings: Listing[] = [];
  const cardRe = /<div class="car-card v2">([\s\S]*?)(?=<div class="car-card v2">|<\/ul>)/g;
  let m: RegExpExecArray | null;
  let id = 0;

  while ((m = cardRe.exec(html)) !== null) {
    const block = m[1];

    const titleM = block.match(/class="title"[^>]*>([\s\S]*?)<\/div>/);
    const priceM = block.match(/class="[^"]*price[^"]*highlighted[^"]*"[^>]*>([\d\s]+)\s*FT/i) ??
                   block.match(/([\d][\d\s]{4,})\s*(?:Ft|FT)/);
    const kmM = block.match(/Km[\s\S]{0,30}?<span>([\d\s]+)<\/span>/);
    const yearM = block.match(/Évjárat[\s\S]{0,30}?<span>(\d{4})<\/span>/);
    const ccmM = block.match(/cm[\s\S]{0,15}?<span>([\d\s]+)<\/span>/);
    const imgM = block.match(/<img[^>]+src="(https:\/\/toyotakovacs\.hu\/[^"]+)"/);
    const urlM = block.match(/href="(https:\/\/toyotakovacs\.hu\/auto\/[^"]+)"/);

    const title = titleM ? decodeHtml(stripTags(titleM[1])) : "";
    if (!title) continue;

    // Toyota Kovács only sells Toyota — determine model from title
    const make = "Toyota";
    const model = title.split(" ")[0];
    const body = mapBody(title);

    // Toyota Kovács sells hybrids predominantly
    const fuel: Fuel = title.toLowerCase().includes("hybrid") ? "hybrid" :
                       title.toLowerCase().includes("electric") || title.toLowerCase().includes("elektromos") ? "electric" :
                       "petrol";
    const transmission: Transmission = title.toLowerCase().includes("e-cvt") || title.toLowerCase().includes("cvt") ? "cvt" :
                                       title.toLowerCase().includes("automata") || title.toLowerCase().includes("auto") ? "automatic" :
                                       "manual";

    id++;
    listings.push({
      id: `tk-${id}`,
      title: `Toyota ${title}`,
      make,
      model,
      priceHuf: pickNum(priceM?.[1]) ?? 0,
      year: pickNum(yearM?.[1]) ?? 2020,
      mileageKm: pickNum(kmM?.[1]) ?? 0,
      displacementCcm: pickNum(ccmM?.[1]),
      fuel,
      transmission,
      body,
      location: "Budapest",
      url: urlM?.[1],
      imageUrl: imgM?.[1],
      notes: `Source: ${source}`,
    });
  }

  return listings;
}

// ── Scrape all sources ───────────────────────────────────────────────────────
type SiteResult = { site: string; ok: boolean; count: number; error?: string };

async function scrapeAll(): Promise<{ listings: Listing[]; results: SiteResult[] }> {
  const sources = [
    {
      name: "Emil Frey Select",
      url: "https://emilfreyselect.hu/kiemelt-hasznaltauto-kinalatunk",
      parser: parseEmilFrey,
    },
    {
      name: "Toyota Kovács",
      url: "https://toyotakovacs.hu/auto-allapot/hasznaltauto/",
      parser: parseToyotaKovacs,
    },
  ];

  const allListings: Listing[] = [];
  const results: SiteResult[] = [];

  await Promise.all(
    sources.map(async ({ name, url, parser }) => {
      try {
        const html = await fetchHtml(url);
        const listings = parser(html, name);
        allListings.push(...listings);
        results.push({ site: name, ok: true, count: listings.length });
      } catch (e) {
        results.push({
          site: name,
          ok: false,
          count: 0,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    })
  );

  return { listings: allListings, results };
}

export async function POST() {
  const { listings, results } = await scrapeAll();
  return NextResponse.json({ listings, results, count: listings.length });
}
