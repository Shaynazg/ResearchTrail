"use client";

import Link from "next/link";
import { useState } from "react";

const STATUSES = ["active", "completed", "archived"];

const STATUS_COLOURS = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-zinc-200 text-zinc-700",
};

// One project on the dashboard.
// canEdit = true for the owner (status dropdown + delete), false for the admin.
export default function ProjectCard({ project, canEdit, showOwner, onChanged }) {
  const [error, setError] = useState("");

  async function changeStatus(event) {
    setError("");
    const response = await fetch(`/api/projects/${project.project_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: event.target.value }),
    });
    if (!response.ok) {
      setError((await response.json()).error);
      return;
    }
    onChanged();
  }

  async function deleteProject() {
    const sure = window.confirm(
      `Delete "${project.title}"? Its ${project.source_count} sources and their citations will be deleted too.`
    );
    if (!sure) return;

    setError("");
    const response = await fetch(`/api/projects/${project.project_id}`, { method: "DELETE" });
    if (!response.ok) {
      setError((await response.json()).error);
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/projects/${project.project_id}`} className="text-lg font-semibold hover:underline">
          {project.title}
        </Link>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[project.status]}`}>
          {project.status}
        </span>
      </div>

      {project.description && <p className="text-sm text-zinc-600">{project.description}</p>}
      {showOwner && <p className="text-sm text-zinc-500">Owner: {project.owner}</p>}

      <div className="flex gap-4 text-sm text-zinc-700">
        <span><strong>{project.source_count}</strong> sources</span>
        <span><strong>{project.citation_count}</strong> citations</span>
        <span><strong>{project.total_minutes}</strong> min read</span>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3 border-t border-zinc-100 pt-3 text-sm">
          <label className="flex items-center gap-2">
            Status
            <select value={project.status} onChange={changeStatus}
              className="rounded border border-zinc-300 bg-white px-2 py-1">
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <button onClick={deleteProject} className="ml-auto text-red-700 hover:underline">
            Delete
          </button>
        </div>
      )}

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}