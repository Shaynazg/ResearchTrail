"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import SourceForm from "@/components/SourceForm";
import useCurrentUser from "@/components/useCurrentUser";

// Add a source to a project
export default function NewSourcePage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useCurrentUser();
  const [data, setData] = useState(null);

  // Load the project's existing sources for the "came from" and "cites" fields
  useEffect(() => {
    fetch(`/api/projects/${id}`).then(async (response) => {
      if (response.ok) setData(await response.json());
    });
  }, [id]);

  // Called by SourceForm; returns an error message or null
  async function createSource(values) {
    const response = await fetch(`/api/projects/${id}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return (await response.json()).error;
    router.push(`/projects/${id}`);
    return null;
  }

  if (!user || !data) {
    return <main className="min-h-screen bg-zinc-50 p-8 text-zinc-600">Loading...</main>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AppHeader user={user} />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Link href={`/projects/${id}`} className="text-sm text-zinc-600 hover:underline">
          &larr; Back to {data.project.title}
        </Link>
        <h1 className="text-2xl font-semibold">Add a source</h1>
        <SourceForm sources={data.sources} submitLabel="Save source" onSubmit={createSource} />
      </main>
    </div>
  );
}