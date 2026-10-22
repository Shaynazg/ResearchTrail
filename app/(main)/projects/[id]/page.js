"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import useCurrentUser from "@/components/useCurrentUser";

const STATUS_PILL = {
  active: "bg-brand-soft text-brand",
  completed: "bg-accent-soft text-accent",
  archived: "bg-line text-muted",
};

// Project page: the project's details and a plain list of its sources
export default function ProjectPage() {
  const { id } = useParams();
  const user = useCurrentUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Changing reloadKey makes the effect below fetch the project again
  const [reloadKey, setReloadKey] = useState(0);

  // Load the project and its sources
  useEffect(() => {
    fetch(`/api/projects/${id}`).then(async (response) => {
      const body = await response.json();
      if (response.ok) setData(body);
      else setError(body.error);
    });
  }, [id, reloadKey]);

  async function deleteSource(source) {
    const sure = window.confirm(
      `Delete "${source.title}"? Its citations are removed too. Sources that came from it move up one level in the trail.`
    );
    if (!sure) return;

    const response = await fetch(`/api/sources/${source.source_id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert((await response.json()).error);
      return;
    }
    setReloadKey((key) => key + 1);
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

  const { project, sources } = data;
  const titleById = Object.fromEntries(sources.map((source) => [source.source_id, source.title]));
  const totalMinutes = sources.reduce((sum, source) => sum + source.time_spent_min, 0);

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <Link href="/dashboard" className="text-sm text-muted hover:text-brand">&larr; All projects</Link>

        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight">{project.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILL[project.status]}`}>
                {project.status}
              </span>
            </div>
            {project.description && <p className="mt-2 text-muted">{project.description}</p>}
            <p className="mt-2 text-sm text-muted">
              {sources.length} sources, {totalMinutes} minutes of reading
            </p>
          </div>
          {project.canEdit && (
            <Link href={`/projects/${project.project_id}/sources/new`} className="btn-primary shrink-0">
              + Add source
            </Link>
          )}
        </section>

        {sources.length === 0 ? (
          <div className="panel p-8 text-center text-muted">
            No sources yet. Add the first thing you read for this project.
          </div>
        ) : (
          <ul className="space-y-3">
            {sources.map((source) => (
              <li key={source.source_id} className="panel p-5">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <h2 className="font-display text-lg font-semibold leading-snug">{source.title}</h2>
                  {project.canEdit && (
                    <span className="ml-auto flex gap-3 text-sm">
                      <Link href={`/sources/${source.source_id}/edit`} className="text-brand hover:underline">Edit</Link>
                      <button onClick={() => deleteSource(source)} className="text-red-700 hover:underline">
                        Delete
                      </button>
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted">
                  <span className="font-medium capitalize text-ink">{source.type}</span>
                  {source.publication_year && <span>, {source.publication_year}</span>}
                  {source.authors && <span>. {source.authors}</span>}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                  <span>
                    Came from:{" "}
                    <span className="text-ink">
                      {source.parent_source_id ? titleById[source.parent_source_id] : "start of a trail"}
                    </span>
                  </span>
                  <span>Cites {source.cites_count}</span>
                  <span>Cited by {source.cited_by_count}</span>
                  <span>{source.time_spent_min} min</span>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                      Open link
                    </a>
                  )}
                </div>

                {source.tags && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {source.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand">{tag}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}