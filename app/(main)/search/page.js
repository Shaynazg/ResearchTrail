"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import useCurrentUser from "@/components/useCurrentUser";

const TYPES = ["paper", "article", "dataset", "website", "video", "book"];
const FILTERS = ["project", "type", "tag", "from", "to"];

// Clickable example searches, shown before the first search
const EXAMPLES = [
  "how attention replaced recurrence",
  "computers learning to translate languages",
  "pre-training language models on lots of text",
  "ocean circulation collapse",
];

// "Paper, 2017" from a source's type and year
function typeAndYear(source) {
  const type = source.type.charAt(0).toUpperCase() + source.type.slice(1);
  return source.publication_year ? `${type}, ${source.publication_year}` : type;
}

// useSearchParams() needs a Suspense boundary in Next.js
export default function SearchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-8 text-muted">Loading...</main>}>
      <Search />
    </Suspense>
  );
}

function Search() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const [filters, setFilters] = useState({ projects: [], tags: [] });

  // The search lives in the URL (/search?q=...&type=paper), so Back and refresh keep it.
  // `found` remembers which URL its results belong to; while they differ, a search is running.
  const paramString = searchParams.toString();
  const text = searchParams.get("q") ?? "";
  const [found, setFound] = useState({ paramString: "", results: null, error: "" });
  const loading = text !== "" && found.paramString !== paramString;

  // Dropdown choices: projects and tags this user can see
  useEffect(() => {
    fetch("/api/search/filters").then(async (response) => {
      if (response.ok) setFilters(await response.json());
    });
  }, []);

  // Run the search whenever the URL changes
  useEffect(() => {
    if (!text) return;
    fetch(`/api/search?${paramString}`).then(async (response) => {
      const body = await response.json();
      setFound({
        paramString,
        results: response.ok ? body.results : null,
        error: response.ok ? "" : body.error,
      });
    });
  }, [paramString, text]);

  // Put the form values into the URL; the effect above then runs the search
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const name of ["q", ...FILTERS]) {
      const value = String(form.get(name) ?? "").trim();
      if (value) next.set(name, value);
    }
    router.push(`/search?${next}`);
  }

  if (!user) {
    return <main className="min-h-screen p-8 text-muted">Loading...</main>;
  }

  const activeFilters = FILTERS.filter((name) => searchParams.get(name));
  const showResults = text && !loading && found.paramString === paramString;

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Search</h1>
          <p className="mt-1 text-muted">
            Describe what you are looking for in your own words. Sources are matched by meaning, not exact words.
          </p>
        </div>

        {/* key={paramString} resets the fields when the URL changes (e.g. an example is clicked) */}
        <form key={paramString} onSubmit={handleSubmit} className="panel space-y-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              type="search"
              defaultValue={text}
              required
              maxLength={500}
              placeholder="e.g. models that read text in both directions"
              aria-label="Search text"
              className="field mt-0 flex-1"
            />
            <button type="submit" className="btn-primary">Search</button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="col-span-2 block text-sm sm:col-span-1">
              <span className="font-medium">Project</span>
              <select name="project" defaultValue={searchParams.get("project") ?? ""} className="field">
                <option value="">All projects</option>
                {filters.projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>{project.title}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Type</span>
              <select name="type" defaultValue={searchParams.get("type") ?? ""} className="field">
                <option value="">Any type</option>
                {TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Tag</span>
              <select name="tag" defaultValue={searchParams.get("tag") ?? ""} className="field">
                <option value="">Any tag</option>
                {filters.tags.map((tag) => (
                  <option key={tag.name} value={tag.name}>{tag.name} ({tag.uses})</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">From year</span>
              <input name="from" type="number" defaultValue={searchParams.get("from") ?? ""} placeholder="1450"
                className="field" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">To year</span>
              <input name="to" type="number" defaultValue={searchParams.get("to") ?? ""} placeholder="2100"
                className="field" />
            </label>
          </div>

          {activeFilters.length > 0 && text && (
            <Link href={`/search?q=${encodeURIComponent(text)}`} className="inline-block text-sm text-brand hover:underline">
              Clear filters
            </Link>
          )}
        </form>

        {/* Before the first search: examples to try */}
        {!text && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Try:</span>
            {EXAMPLES.map((example) => (
              <Link key={example} href={`/search?q=${encodeURIComponent(example)}`}
                className="rounded-full border border-line bg-surface px-3 py-1 hover:border-brand hover:text-brand">
                {example}
              </Link>
            ))}
          </div>
        )}

        {loading && <p className="text-muted">Searching...</p>}

        {showResults && found.error && <p className="error-box">{found.error}</p>}

        {showResults && found.results && (
          <section className="space-y-3">
            <p className="text-sm text-muted">
              {found.results.length === 0
                ? "No sources match these filters."
                : `${found.results.length} closest ${found.results.length === 1 ? "match" : "matches"}. A similarity near 1 means very close in meaning; below about 0.2 is only loosely related.`}
            </p>

            <ul className="space-y-3">
              {found.results.map((result) => (
                <li key={result.source_id} className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sources/${result.source_id}`}
                      className="font-display text-lg font-semibold leading-snug hover:text-brand">
                      {result.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      <span className="font-medium text-ink">{typeAndYear(result)}</span>
                      <span> in </span>
                      <Link href={`/projects/${result.project_id}`} className="hover:text-brand hover:underline">
                        {result.project_title}
                      </Link>
                    </p>
                    {result.abstract && <p className="mt-2 line-clamp-2 text-sm">{result.abstract}</p>}
                    {result.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {result.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:w-36 sm:pt-1" title="Cosine similarity">
                    <span className="text-xs text-muted sm:hidden">Similarity</span>
                    <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-line sm:block">
                      <div className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(0, result.similarity) * 100}%` }} />
                    </div>
                    <span className="w-9 text-right text-sm font-medium tabular-nums">{result.similarity.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
