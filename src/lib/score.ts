import type { Listing, ScoredListing, SearchCriteria } from "@/lib/types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normString(s: string) {
  return s.trim().toLowerCase();
}

function containsAny(haystack: string, needles: string[]) {
  const h = normString(haystack);
  return needles.some((n) => n && h.includes(normString(n)));
}

function scorePrice(listingPrice: number, budget?: number, flexPct = 10) {
  if (!budget || budget <= 0) return { score: 0.6, reason: "No budget set" };
  const flex = clamp(flexPct, 0, 100) / 100;
  const hardMax = budget * (1 + flex);
  if (listingPrice <= budget) return { score: 1.0, reason: "Within budget" };
  if (listingPrice > hardMax) return { score: 0.0, reason: "Over budget" };
  const over = (listingPrice - budget) / (hardMax - budget);
  return { score: clamp(1 - over, 0, 1), reason: "Slightly over budget" };
}

function scoreMileage(mileageKm: number, maxKm?: number) {
  if (!maxKm || maxKm <= 0) return { score: 0.6, reason: "No mileage cap" };
  if (mileageKm <= maxKm) return { score: 1.0, reason: "Mileage OK" };
  // degrade to 0 at +50% over max
  const softMax = maxKm * 1.5;
  if (mileageKm >= softMax) return { score: 0.0, reason: "High mileage" };
  const over = (mileageKm - maxKm) / (softMax - maxKm);
  return { score: clamp(1 - over, 0, 1), reason: "Mileage a bit high" };
}

function scoreYear(year: number, min?: number, max?: number) {
  if (!min && !max) return { score: 0.6, reason: "No year range" };
  if (min && year < min) return { score: 0.0, reason: "Too old" };
  if (max && year > max) return { score: 0.7, reason: "Newer than requested" };
  return { score: 1.0, reason: "Year OK" };
}

export function scoreAndFilterListings(
  listings: Listing[],
  c: SearchCriteria
): ScoredListing[] {
  const queryTokens = normString(c.query ?? "")
    .split(/\s+/g)
    .filter(Boolean);

  const fuels = new Set(c.fuels ?? []);
  const transmissions = new Set(c.transmissions ?? []);
  const bodies = new Set(c.bodies ?? []);
  const locations = (c.locations ?? []).map(normString).filter(Boolean);

  const results: ScoredListing[] = [];

  for (const l of listings) {
    // hard filters
    if (fuels.size && !fuels.has(l.fuel)) continue;
    if (transmissions.size && !transmissions.has(l.transmission)) continue;
    if (bodies.size && !bodies.has(l.body)) continue;
    if (c.yearMin && l.year < c.yearMin) continue;
    if (c.yearMax && l.year > c.yearMax) continue;

    if (locations.length) {
      const loc = normString(l.location ?? "");
      if (!loc || !locations.some((needle) => loc.includes(needle))) continue;
    }

    if (queryTokens.length) {
      const blob = `${l.title} ${l.make ?? ""} ${l.model ?? ""} ${
        l.notes ?? ""
      }`;
      if (!containsAny(blob, queryTokens)) continue;
    }

    const reasons: string[] = [];

    const price = scorePrice(l.priceHuf, c.budgetHuf, c.budgetFlexPct ?? 10);
    reasons.push(price.reason);

    const mile = scoreMileage(l.mileageKm, c.mileageMaxKm);
    reasons.push(mile.reason);

    const yr = scoreYear(l.year, c.yearMin, c.yearMax);
    reasons.push(yr.reason);

    // query relevance boosts (soft)
    let rel = 0.6;
    if (queryTokens.length) {
      const blob = normString(
        `${l.title} ${l.make ?? ""} ${l.model ?? ""} ${l.notes ?? ""}`
      );
      const hits = queryTokens.filter((t) => t && blob.includes(t)).length;
      rel = clamp(0.5 + hits / Math.max(3, queryTokens.length), 0, 1);
      reasons.push(hits ? `Matches ${hits} keyword(s)` : "Weak keyword match");
    } else {
      reasons.push("No keywords");
    }

    // weighted score
    const score01 =
      0.45 * price.score + 0.25 * mile.score + 0.2 * yr.score + 0.1 * rel;

    results.push({
      ...l,
      score: Math.round(clamp(score01, 0, 1) * 100),
      reasons,
    });
  }

  results.sort((a, b) => b.score - a.score || a.priceHuf - b.priceHuf);
  return results;
}

