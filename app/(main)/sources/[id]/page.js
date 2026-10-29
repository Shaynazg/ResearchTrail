"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import useCurrentUser from "@/components/useCurrentUser";

// "Paper, 2017" from a source's type and year
function typeAndYear(source) {
  const type = source.type.charAt(0).toUpperCase() + source.type.slice(1);
  return source.publication_year ? `${type}, ${source.publication_year}` : type;
}

// One linked source in the "Cites" and "Cited by" lists
function SourceLink({ source }) {
  return (
    <li>
      <Link href={`/sources/${source.source_id}`} className="font-medium hover:text-brand hover:underline">
        {source.title}
      </Link>
      <span className="ml-2 text-sm text-muted">{typeAndYear(source)}</span>
    </li>
  );
}

// Source page: details, browse path, citations both ways and similar sources
export default function SourcePage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useCurrentUser();
  const [data, setData] = useState(null);
  const [similar, setSimilar] = useState(null);
  const [error, setError] = useState("");

  // Details, browse path and citations
  useEffect(() => {
    fetch(`/api/sources/${id}/details`).then(async (response) => {
      const body = await response.json();
      if (response.ok) setData(body);
      else setError(body.error);
    });
  }, [id]);

  // Similar sources load separately, so the rest of the page does not wait for them
  useEffect(() => {
    fetch(`/api/sources/${id}/similar`).then(async (response) => {
      if (response.ok) setSimilar(await response.json());
    });
  }, [id]);

  async function deleteSource() {
    const sure = window.confirm(
      `Delete "${data.source.title}"? Its citations are removed too. Sources that came from it move up one level in the trail.`
    );
    if (!sure) return;

    const response = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert((await response.json()).error);
      return;
    }
    router.push(`/projects/${data.source.project_id}`);
  }

  if (!user || (!data && !error)) {
    return <main className="min-h-screen p-8 text-muted">Loading...</main>;
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <AppHeader user={user} />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <p className="error-box">{error}</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm text-brand hover:underline">
            Back to projects
          </Link>
        </main>
      </div>
    );
  }

  const { source, path, cites, citedBy } = data;
  const visited = new Date(source.visited_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <Link href={`/projects/${source.project_id}`} className="text-sm text-muted hover:text-brand">
          &larr; {source.project_title}
        </Link>

        {/* Browse path: how the researcher got here, from get_browse_path() */}
        <nav aria-label="Browse path" className="text-sm">
          <span className="mr-2 font-medium text-muted">Trail:</span>
          {path.length === 1 ? (
            <span className="text-muted">this source starts a new trail</span>
          ) : (
            path.map((step, index) => (
              <span key={step.source_id}>
                {index > 0 && <span className="mx-1.5 text-muted">&rsaquo;</span>}
                {step.source_id === source.source_id ? (
                  <span className="font-medium text-ink">{step.title}</span>
                ) : (
                  <Link href={`/sources/${step.source_id}`} className="text-brand hover:underline">
                    {step.title}
                  </Link>
                )}
              </span>
            ))
          )}
        </nav>

        {/* Details */}
        <section className="panel space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{source.title}</h1>
              <p className="mt-2 text-muted">
                <span className="font-medium text-ink">{typeAndYear(source)}</span>
                {source.authors && <span>. {source.authors}</span>}
              </p>
            </div>
            {source.canEdit && (
              <div className="flex shrink-0 gap-2">
                <Link href={`/sources/${source.source_id}/edit`} className="btn-secondary">Edit</Link>
                <button onClick={deleteSource} className="btn-secondary text-red-700">Delete</button>
              </div>
            )}
          </div>

          {source.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {source.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span>Read on {visited}</span>
            <span>{source.time_spent_min} min</span>
            {source.url && (
              <a href={source.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                Open link
              </a>
            )}
          </div>

          {source.abstract && (
            <div>
              <h2 className="text-sm font-semibold">Abstract</h2>
              <p className="mt-1 leading-relaxed">{source.abstract}</p>
            </div>
          )}

          {source.note && (
            <div className="rounded-lg border-l-4 border-accent bg-accent-soft px-4 py-3">
              <h2 className="text-sm font-semibold text-accent">Note</h2>
              <p className="mt-1">{source.note}</p>
            </div>
          )}
        </section>

        {/* Citation graph, both directions */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Cites ({cites.length})</h2>
            {cites.length === 0 ? (
              <p className="mt-2 text-sm text-muted">This source does not cite any other source in the project.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {cites.map((cited) => <SourceLink key={cited.source_id} source={cited} />)}
              </ul>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Cited by ({citedBy.length})</h2>
            {citedBy.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No other source in the project cites this one.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {citedBy.map((citing) => <SourceLink key={citing.source_id} source={citing} />)}
              </ul>
            )}
          </section>
        </div>

        {/* Vector similarity search */}
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Similar sources</h2>
          <p className="text-sm text-muted">
            Closest in meaning by title and abstract, across {user.role === "admin" ? "all" : "your"} projects.
          </p>

          {!similar ? (
            <p className="mt-3 text-sm text-muted">Finding similar sources...</p>
          ) : !similar.hasEmbedding ? (
            <p className="mt-3 text-sm text-muted">
              This source has no embedding yet. Run <code>npm run embeddings</code> to create it.
            </p>
          ) : similar.similar.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No other sources to compare with yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {similar.similar.map((match) => (
                <li key={match.source_id} className="flex items-center gap-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sources/${match.source_id}`} className="font-medium hover:text-brand hover:underline">
                      {match.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {typeAndYear(match)}
                      {match.project_id !== source.project_id && <span>, in {match.project_title}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:w-32" title="Cosine similarity">
                    <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-line sm:block">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(0, match.similarity) * 100}%` }} />
                    </div>
                    <span className="w-9 text-right text-sm tabular-nums">{match.similarity.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
