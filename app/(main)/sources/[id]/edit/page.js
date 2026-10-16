"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import SourceForm from "@/components/SourceForm";
import useCurrentUser from "@/components/useCurrentUser";

// Edit an existing source
export default function EditSourcePage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useCurrentUser();
  const [source, setSource] = useState(null);
  const [otherSources, setOtherSources] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/sources/${id}`);
      const body = await response.json();
      if (!response.ok || !body.source.canEdit) {
        setError(body.error ?? "You cannot edit this source.");
        return;
      }
      // The project's other sources, for the "came from" and "cites" fields
      const projectResponse = await fetch(`/api/projects/${body.source.project_id}`);
      const projectBody = await projectResponse.json();
      setOtherSources(projectBody.sources.filter((other) => other.source_id !== body.source.source_id));
      setSource(body.source);
    }
    load();
  }, [id]);

  // Called by SourceForm; returns an error message or null
  async function saveSource(values) {
    const response = await fetch(`/api/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return (await response.json()).error;
    router.push(`/projects/${source.project_id}`);
    return null;
  }

  if (!user || (!source && !error)) {
    return <main className="min-h-screen bg-zinc-50 p-8 text-zinc-600">Loading...</main>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AppHeader user={user} />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {error ? (
          <>
            <p className="text-red-700">{error}</p>
            <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
          </>
        ) : (
          <>
            <Link href={`/projects/${source.project_id}`} className="text-sm text-zinc-600 hover:underline">
              &larr; Back to project
            </Link>
            <h1 className="text-2xl font-semibold">Edit source</h1>
            <SourceForm sources={otherSources} initial={source} submitLabel="Save changes" onSubmit={saveSource} />
          </>
        )}
      </main>
    </div>
  );
}