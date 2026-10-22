import TrailMark from "@/components/TrailMark";

// Example trail shown beside the login and signup forms
const EXAMPLE_TRAIL = [
  "The Illustrated Transformer",
  "Attention Is All You Need",
  "BERT: Pre-training of Deep Bidirectional Transformers",
];

// Two-column page for login and signup: brand panel on the left, form on the right
export default function AuthLayout({ children }) {
  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[var(--header-bg)] p-10 text-[var(--header-ink)] md:flex">
        <div className="flex items-center gap-2.5">
          <TrailMark className="h-8 w-8" />
          <span className="font-display text-2xl font-semibold tracking-tight">ResearchTrail</span>
        </div>

        <div className="max-w-sm">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Every paper leads somewhere.
            <span className="block">ResearchTrail keeps track of where.</span>
          </h2>
          <p className="mt-3 opacity-80">
            Log every source, the one that led to it, and what it cites.
          </p>

          <ol className="mt-8 space-y-0">
            {EXAMPLE_TRAIL.map((title, index) => (
              <li key={title} className="relative flex gap-3 pb-5 last:pb-0">
                {index < EXAMPLE_TRAIL.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-current opacity-30" aria-hidden="true" />
                )}
                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current" aria-hidden="true" />
                <span className="text-sm opacity-90">{title}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs opacity-60">DBMS Mini Project, PES University</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-brand md:hidden">
            <TrailMark />
            <span className="font-display text-xl font-semibold">ResearchTrail</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}