import Finder from "@/components/Finder";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Hungary • used cars • match scoring
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">car2buy</h1>
            </div>
            <a
              className="text-sm font-medium underline underline-offset-4 opacity-80 hover:opacity-100"
              href="https://github.com/sylarshot"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Filter and rank listings by how well they fit your budget, year, and mileage
            preferences. Start with the built-in sample data, or import your own CSV.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Client UI (form + results) */}
          <Finder />
        </div>
      </div>
    </div>
  );
}
