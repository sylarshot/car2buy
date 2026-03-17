import { NextResponse } from "next/server";
import type { Listing } from "@/lib/types";

type IngestRequest = {
  urls: string[];
};

function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      // Some sites block default user agents; this helps without pretending to be a browser.
      "user-agent": "car2buy/1.0 (+https://car2buy.vercel.app)",
      accept: "text/html,application/xhtml+xml",
    },
    // keep server-side fetches fresh-ish
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status})`);
  }
  return await res.text();
}

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractJsonLd(html: string): unknown[] {
  // Best-effort JSON-LD extraction. Many car listing sites embed Vehicle/Product JSON-LD.
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(html))) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // ignore invalid blocks
    }
  }
  return out;
}

function extractTitle(html: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, " ").trim();
}

function extractOgImage(html: string) {
  const m = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  return m?.[1]?.trim();
}

function hasGraph(x: unknown): x is { "@graph": unknown } {
  return !!x && typeof x === "object" && "@graph" in x;
}

function toRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : null;
}

function normalizeToListing(url: string, html: string): Listing {
  const jsonlds = extractJsonLd(html);

  // Try to find something that looks like Vehicle or Product.
  const candidates = jsonlds
    .flatMap((x) => {
      if (hasGraph(x)) {
        const g = (x as { "@graph": unknown })["@graph"];
        return Array.isArray(g) ? g : [];
      }
      return [x];
    })
    .filter((x) => x && typeof x === "object");

  const vehicleLike = candidates
    .map(toRecord)
    .find((o) => {
      const t = o?.["@type"];
    const types = Array.isArray(t) ? t : [t];
    return types.includes("Vehicle") || types.includes("Car") || types.includes("Product");
  }) as Record<string, unknown> | undefined;

  const title =
    pickString(vehicleLike?.name) ||
    pickString(vehicleLike?.headline) ||
    extractTitle(html) ||
    url;

  const image =
    pickString(vehicleLike?.image) ||
    pickString(Array.isArray(vehicleLike?.image) ? (vehicleLike?.image as unknown[])[0] : undefined) ||
    extractOgImage(html);

  // Price (often Product/Offer)
  const offer = vehicleLike?.offers;
  const price =
    pickNumber((toRecord(offer) ?? {})?.price) ||
    pickNumber(Array.isArray(offer) ? (toRecord((offer as unknown[])[0]) ?? {})?.price : undefined);

  // Try to extract year / mileage from common JSON-LD shapes (best-effort)
  const year = pickNumber(vehicleLike?.vehicleModelDate) ?? undefined;
  const mileageFromOdometer = toRecord(vehicleLike?.mileageFromOdometer);
  const mileage = pickNumber(mileageFromOdometer?.value) ?? undefined;

  // We must return a complete Listing for the UI. For unknown fields, use safe defaults.
  // These defaults are intentionally conservative and should be overridden by CSV for accuracy.
  return {
    id: url,
    title,
    url,
    imageUrl: image,
    priceHuf: typeof price === "number" ? Math.round(price) : 0,
    year: typeof year === "number" ? Math.round(year) : 2000,
    mileageKm: typeof mileage === "number" ? Math.round(mileage) : 0,
    fuel: "petrol",
    transmission: "manual",
    body: "sedan",
    notes:
      "Fetched live from URL (best-effort). For accurate fuel/body/transmission/year/km, prefer CSV import.",
  };
}

export async function POST(req: Request) {
  let body: IngestRequest | null = null;
  try {
    body = (await req.json()) as IngestRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const urls = (body?.urls ?? []).map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean);
  if (!urls.length) {
    return NextResponse.json({ error: "Provide at least one URL." }, { status: 400 });
  }

  const bad = urls.find((u) => !isHttpUrl(u));
  if (bad) {
    return NextResponse.json({ error: `Invalid URL: ${bad}` }, { status: 400 });
  }

  const limited = urls.slice(0, 15); // keep it fast + polite

  const results: { url: string; ok: boolean; listing?: Listing; error?: string }[] = [];

  await Promise.all(
    limited.map(async (url) => {
      try {
        const html = await fetchText(url);
        const listing = normalizeToListing(url, html);
        results.push({ url, ok: true, listing });
      } catch (e) {
        results.push({
          url,
          ok: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    })
  );

  const listings = results.filter((r) => r.ok && r.listing).map((r) => r.listing!) as Listing[];
  return NextResponse.json({ listings, results });
}

