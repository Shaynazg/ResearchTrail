"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import useCurrentUser from "@/components/useCurrentUser";

// Project page: the project's details and a plain list of its sources.
// (Your teammate adds filters and the browse tree here later.)
export default function ProjectPage() {
  const { id } = useParams();
  const user = useCurrentUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${id}`).then(async (response) => {
      const body = await response.json();
      if (response.ok) setData(body);
      else setError(body.error);
    });
  }, [id]);

  if (!user || (!data && !error)) {
    return <main className="min-h-screen bg-zinc-50 p-8 text-zinc-600">Loading...</main>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <AppHeader user={user} />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-red-700">{error}</p>
          <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
        </main>
      </div>
    );
  }

  const { project, sources } = data;
  const titleById = Object.fromEntries(sources.map((source) => [source.source_id, source.title]));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Link href="/dashboard" className="text-sm text-zinc-600 hover:underline">&larr; All projects</Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            {project.description && <p className="mt-1 text-zinc-600">{project.description}</p>}
            <p className="mt-1 text-sm text-zinc-500">Status: {project.status}</p>
          </div>
          {project.canEdit && (
            <Link href={`/projects/${project.project_id}/sources/new`}
              className="shrink-0 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              + Add source
            </Link>
          )}
        </div>

        <h2 className="text-lg font-semibold">Sources ({sources.length})</h2>

        {sources.length === 0 ? (
          <p className="text-zinc-600">No sources yet.</p>
        ) : (
          <ul className="space-y-3">
            {sources.map((source) => (
              <li key={source.source_id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{source.title}</span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">{source.type}</span>
                  {source.publication_year && (
                    <span className="text-sm text-zinc-500">{source.publication_year}</span>
                  )}
                </div>
                {source.authors && <p className="mt-1 text-sm text-zinc-600">{source.authors}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                  <span>
                    Came from: {source.parent_source_id ? titleById[source.parent_source_id] : "start of a trail"}
                  </span>
                  <span>Cites {source.cites_count}</span>
                  <span>Cited by {source.cited_by_count}</span>
                  <span>{source.time_spent_min} min</span>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noreferrer" className="underline">Open link</a>
                  )}
                </div>
                {source.tags && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {source.tags.map((tag) => (
                      <span key={tag} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800">{tag}</span>
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