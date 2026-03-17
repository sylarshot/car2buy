"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { BodyType, Fuel, Listing, SearchCriteria, Transmission } from "@/lib/types";
import { sampleListings } from "@/lib/sampleListings";
import { parseListingsCsv } from "@/lib/csv";
import { scoreAndFilterListings } from "@/lib/score";
import { Badge, Button, Card, FieldLabel, Hint, Input, Select } from "@/components/ui";

const fuelOptions: { id: Fuel; label: string }[] = [
  { id: "petrol", label: "Petrol (Benzin)" },
  { id: "hybrid", label: "Hybrid" },
  { id: "plugin_hybrid", label: "Plug-in hybrid (PHEV)" },
  { id: "electric", label: "Electric (EV)" },
];

const transmissionOptions: { id: Transmission; label: string }[] = [
  { id: "manual", label: "Manual" },
  { id: "automatic", label: "Automatic" },
  { id: "cvt", label: "CVT" },
  { id: "other", label: "Other" },
];

const bodyOptions: { id: BodyType; label: string }[] = [
  { id: "hatchback", label: "Hatchback" },
  { id: "sedan", label: "Sedan" },
  { id: "suv", label: "SUV" },
  { id: "coupe", label: "Coupe" },
  { id: "convertible", label: "Convertible" },
];

function formatHuf(n: number) {
  try {
    return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
  } catch {
    return `${n} Ft`;
  }
}

function parseMaybeNumber(s: string) {
  const cleaned = s.replace(/[^\d-]/g, "");
  if (!cleaned) return undefined;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : undefined;
}

function toggle<T>(set: Set<T>, v: T) {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

export default function Finder() {
  type Source = "sample" | "csv";
  const [source, setSource] = useState<Source>("sample");
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvListings, setCsvListings] = useState<Listing[] | null>(null);
  const [liveUrlsText, setLiveUrlsText] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<
    { url: string; ok: boolean; error?: string }[]
  >([]);
  const [liveListings, setLiveListings] = useState<Listing[] | null>(null);

  const [query, setQuery] = useState("");
  const [budgetHuf, setBudgetHuf] = useState("4500000");
  const [budgetFlexPct, setBudgetFlexPct] = useState("10");
  const [yearMin, setYearMin] = useState("2014");
  const [yearMax, setYearMax] = useState("");
  const [mileageMaxKm, setMileageMaxKm] = useState("180000");
  const [location, setLocation] = useState("");

  const [fuels, setFuels] = useState<Set<Fuel>>(new Set());
  const [transmissions, setTransmissions] = useState<Set<Transmission>>(new Set());
  const [bodies, setBodies] = useState<Set<BodyType>>(new Set());

  const listings = useMemo<Listing[]>(
    () => {
      if (source === "sample") return sampleListings;
      return csvListings ?? liveListings ?? [];
    },
    [source, csvListings, liveListings]
  );

  const criteria: SearchCriteria = useMemo(
    () => ({
      query: query.trim() || undefined,
      budgetHuf: parseMaybeNumber(budgetHuf),
      budgetFlexPct: parseMaybeNumber(budgetFlexPct),
      yearMin: parseMaybeNumber(yearMin),
      yearMax: parseMaybeNumber(yearMax),
      mileageMaxKm: parseMaybeNumber(mileageMaxKm),
      fuels: fuels.size ? Array.from(fuels) : undefined,
      transmissions: transmissions.size ? Array.from(transmissions) : undefined,
      bodies: bodies.size ? Array.from(bodies) : undefined,
      locations: location.trim() ? [location.trim()] : undefined,
    }),
    [
      query,
      budgetHuf,
      budgetFlexPct,
      yearMin,
      yearMax,
      mileageMaxKm,
      fuels,
      transmissions,
      bodies,
      location,
    ]
  );

  const scored = useMemo(() => scoreAndFilterListings(listings, criteria), [listings, criteria]);

  function onImportCsv() {
    setCsvError(null);
    setCsvWarnings([]);
    const res = parseListingsCsv(csvText);
    if (!res.ok) {
      setCsvError(res.error);
      setCsvListings(null);
      return;
    }
    setCsvListings(res.listings);
    setCsvWarnings(res.warnings);
    setSource("csv");
  }

  async function onFetchLive() {
    setLiveError(null);
    setLiveResults([]);
    setLiveLoading(true);
    try {
      const urls = liveUrlsText
        .split(/\r?\n/g)
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const json: unknown = await res.json();
      const obj = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) ?? null;
      if (!res.ok) {
        const err = obj && typeof obj.error === "string" ? obj.error : "Live ingest failed.";
        setLiveError(err);
        setLiveListings(null);
        return;
      }

      const listings = Array.isArray(obj?.listings) ? (obj?.listings as Listing[]) : [];
      const results = Array.isArray(obj?.results)
        ? (obj?.results as { url: string; ok: boolean; error?: string }[])
        : [];

      setLiveListings(listings);
      setLiveResults(results);
      setSource("csv");
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "Live ingest failed.");
      setLiveListings(null);
    } finally {
      setLiveLoading(false);
    }
  }

  function onReset() {
    setQuery("");
    setBudgetHuf("4500000");
    setBudgetFlexPct("10");
    setYearMin("2014");
    setYearMax("");
    setMileageMaxKm("180000");
    setLocation("");
    setFuels(new Set());
    setTransmissions(new Set());
    setBodies(new Set());
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Your criteria</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Use hard filters (fuel/body/etc.) plus a match score for price, mileage, year.
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onReset}>
                Reset
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <FieldLabel>Keywords</FieldLabel>
              <Input
                placeholder="e.g. Toyota Corolla, hybrid, DSG..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Hint>Matches title/make/model/notes. Tokens are OR-ed.</Hint>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <FieldLabel>Budget (HUF)</FieldLabel>
                <Input value={budgetHuf} onChange={(e) => setBudgetHuf(e.target.value)} inputMode="numeric" />
                <Hint>Used as main price scoring anchor.</Hint>
              </div>
              <div className="grid gap-2">
                <FieldLabel>Flex above budget (%)</FieldLabel>
                <Input
                  value={budgetFlexPct}
                  onChange={(e) => setBudgetFlexPct(e.target.value)}
                  inputMode="numeric"
                />
                <Hint>Up to this % over budget still scores (lower).</Hint>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <FieldLabel>Year min</FieldLabel>
                <Input value={yearMin} onChange={(e) => setYearMin(e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Year max (optional)</FieldLabel>
                <Input value={yearMax} onChange={(e) => setYearMax(e.target.value)} inputMode="numeric" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <FieldLabel>Mileage max (km)</FieldLabel>
                <Input
                  value={mileageMaxKm}
                  onChange={(e) => setMileageMaxKm(e.target.value)}
                  inputMode="numeric"
                />
                <Hint>Above this degrades; +50% is near-zero.</Hint>
              </div>
              <div className="grid gap-2">
                <FieldLabel>Location contains (optional)</FieldLabel>
                <Input placeholder="e.g. Budapest" value={location} onChange={(e) => setLocation(e.target.value)} />
                <Hint>Substring match on listing location.</Hint>
              </div>
            </div>

            <div className="grid gap-2">
              <FieldLabel>Fuel (hard filter)</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {fuelOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setFuels((s) => toggle(s, o.id))}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      fuels.has(o.id)
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/10 bg-white text-zinc-900 hover:bg-black/[.04] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <FieldLabel>Transmission (hard filter)</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {transmissionOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setTransmissions((s) => toggle(s, o.id))}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      transmissions.has(o.id)
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/10 bg-white text-zinc-900 hover:bg-black/[.04] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <FieldLabel>Body type (hard filter)</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {bodyOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setBodies((s) => toggle(s, o.id))}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      bodies.has(o.id)
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/10 bg-white text-zinc-900 hover:bg-black/[.04] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-lg font-semibold">Sources (manual for now)</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Use these sites to collect listings, then paste a CSV export into the importer.
          </div>
          <ul className="mt-4 grid gap-2 text-sm">
            {[
              { label: "Használtautó", href: "https://www.hasznaltauto.hu/" },
              { label: "Duna Autó", href: "https://dunaauto.hu" },
              {
                label: "Peugeot Fábián (used)",
                href: "https://www.peugeotfabian.hu/budapest/hasznaltauto/?caru-smPage=1",
              },
              {
                label: "Emil Frey Select",
                href: "https://emilfreyselect.hu/kiemelt-hasznaltauto-kinalatunk",
              },
              {
                label: "Toyota Kovács (used)",
                href: "https://toyotakovacs.hu/auto-allapot/hasznaltauto/?gad_source=1&gad_campaignid=1697753888&gbraid=0AAAAAD5jtTF5DyO5Lr-qZWihSQt7PVGFF&gclid=Cj0KCQjw9-PNBhDfARIsABHN6-26kobdn-SXxbwvz3LHCVBo1oO0LaSnCJDKttHFeos-bauxQ38NAnsaAiaREALw_wcB",
              },
              { label: "Das WeltAuto", href: "https://www.dasweltauto.hu" },
            ].map((s) => (
              <li key={s.href}>
                <a
                  className="font-medium underline underline-offset-4 opacity-85 hover:opacity-100"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.href}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Data source</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Use sample listings now; import CSV or fetch live from listing URLs.
              </div>
            </div>
            <Select
              value={source}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "sample" || v === "csv") setSource(v);
              }}
              className="max-w-[160px]"
            >
              <option value="sample">Sample</option>
              <option value="csv">CSV</option>
            </Select>
          </div>

          <div className="mt-4 grid gap-2">
            <FieldLabel>Live (URLs)</FieldLabel>
            <Hint>
              Paste listing URLs (one per line) from Használtautó / Jófogás / dealer sites. The server fetches each page and extracts best-effort JSON‑LD/meta data.
            </Hint>
            <textarea
              className={[
                "min-h-[110px] w-full rounded-xl border border-black/10 bg-white p-3 text-xs text-zinc-900 outline-none",
                "focus:ring-2 focus:ring-zinc-900/10",
                "dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-white/10",
              ].join(" ")}
              placeholder={`https://www.hasznaltauto.hu/\nhttps://www.dasweltauto.hu`}
              value={liveUrlsText}
              onChange={(e) => setLiveUrlsText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onFetchLive} disabled={liveLoading || !liveUrlsText.trim().length}>
                {liveLoading ? "Fetching..." : "Fetch live"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setLiveUrlsText("");
                  setLiveError(null);
                  setLiveResults([]);
                  setLiveListings(null);
                }}
                disabled={liveLoading || (!liveUrlsText.trim().length && !liveListings)}
              >
                Clear live
              </Button>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Live rows: <span className="font-medium">{liveListings?.length ?? 0}</span>
              </div>
            </div>
            {liveError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {liveError}
              </div>
            ) : null}
            {liveResults.length ? (
              <div className="rounded-xl border border-black/10 bg-white p-3 text-xs text-zinc-600 dark:border-white/10 dark:bg-black dark:text-zinc-400">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Live fetch results</div>
                <ul className="mt-1 list-disc pl-5">
                  {liveResults.slice(0, 6).map((r) => (
                    <li key={r.url}>
                      {r.ok ? "OK" : `Failed: ${r.error ?? "error"}`} –{" "}
                      <a className="underline underline-offset-4" href={r.url} target="_blank" rel="noreferrer">
                        {r.url}
                      </a>
                    </li>
                  ))}
                </ul>
                {liveResults.length > 6 ? <div className="mt-1">…and {liveResults.length - 6} more</div> : null}
              </div>
            ) : null}

            <FieldLabel>CSV import</FieldLabel>
            <Hint>
              Required columns: <code className="font-mono">id,title,priceHuf,year,mileageKm,fuel,transmission,body</code>
              . Optional: <code className="font-mono">make,model,imageUrl,location,powerKw,displacementCcm,notes,url,createdAt</code>
            </Hint>
            <textarea
              className={[
                "min-h-[140px] w-full rounded-xl border border-black/10 bg-white p-3 text-xs text-zinc-900 outline-none",
                "focus:ring-2 focus:ring-zinc-900/10",
                "dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-white/10",
              ].join(" ")}
              placeholder={`id,title,priceHuf,year,mileageKm,fuel,transmission,body,imageUrl,location\n1,"Toyota Corolla 1.6",3990000,2016,128000,petrol,manual,sedan,/cars/corolla.svg,Budapest`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onImportCsv} disabled={!csvText.trim().length}>
                Import CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCsvText("");
                  setCsvError(null);
                  setCsvWarnings([]);
                  setCsvListings(null);
                }}
                disabled={!csvText.trim().length && !csvListings}
              >
                Clear
              </Button>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Active rows: <span className="font-medium">{source === "sample" ? sampleListings.length : (csvListings?.length ?? 0)}</span>
              </div>
            </div>
            {csvError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {csvError}
              </div>
            ) : null}
            {csvWarnings.length ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <div className="font-medium">Warnings</div>
                <ul className="mt-1 list-disc pl-5">
                  {csvWarnings.slice(0, 6).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
                {csvWarnings.length > 6 ? <div className="mt-1">…and {csvWarnings.length - 6} more</div> : null}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="h-fit">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Ranked results</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Sorted by match score (then cheaper).
              </div>
            </div>
            <Badge>{scored.length} match(es)</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            {scored.length ? (
              scored.slice(0, 20).map((l) => (
                <div
                  key={l.id}
                  className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-4">
                      {l.url ? (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative mt-0.5 hidden h-[76px] w-[124px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-zinc-100 dark:border-white/10 dark:bg-white/5 sm:block"
                          aria-label={`Open listing: ${l.title}`}
                        >
                          {l.imageUrl ? (
                            <Image
                              src={l.imageUrl}
                              alt={l.title}
                              fill
                              sizes="124px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                              No image
                            </div>
                          )}
                        </a>
                      ) : (
                        <div className="relative mt-0.5 hidden h-[76px] w-[124px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-zinc-100 dark:border-white/10 dark:bg-white/5 sm:block">
                          {l.imageUrl ? (
                            <Image
                              src={l.imageUrl}
                              alt={l.title}
                              fill
                              sizes="124px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                              No image
                            </div>
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        {l.url ? (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-base font-semibold underline-offset-4 hover:underline"
                          >
                            {l.title}
                          </a>
                        ) : (
                          <div className="truncate text-base font-semibold">{l.title}</div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <span>{formatHuf(l.priceHuf)}</span>
                          <span>•</span>
                          <span>{l.year}</span>
                          <span>•</span>
                          <span>{new Intl.NumberFormat("hu-HU").format(l.mileageKm)} km</span>
                          {l.location ? (
                            <>
                              <span>•</span>
                              <span>{l.location}</span>
                            </>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge>{l.fuel}</Badge>
                          <Badge>{l.transmission}</Badge>
                          <Badge>{l.body}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {l.url ? (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl px-2 py-1 text-right hover:bg-black/[.04] dark:hover:bg-white/10"
                          aria-label={`Open listing: ${l.title}`}
                        >
                          <div className="text-2xl font-semibold tabular-nums">{l.score}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            match score · <span className="underline underline-offset-4">Open</span>
                          </div>
                        </a>
                      ) : (
                        <>
                          <div className="text-2xl font-semibold tabular-nums">{l.score}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">match score</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {l.reasons.slice(0, 4).map((r, i) => (
                      <div key={i}>- {r}</div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-black dark:text-zinc-400">
                No matches. Try loosening hard filters (fuel/body/transmission) or increasing mileage/budget.
              </div>
            )}
          </div>

          {scored.length > 20 ? (
            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Showing top 20. Narrow criteria to reduce.
            </div>
          ) : null}
        </Card>

        <Card className="h-fit">
          <div className="text-lg font-semibold">What to improve next</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Add real scraping/integration (Használtautó, Jófogás) via backend jobs.</li>
            <li>VIN check hooks, service history scoring, and risk flags (fleet/taxi).</li>
            <li>Distance-to-seller scoring and map view.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

