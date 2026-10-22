"use client";

import Link from "next/link";
import { useState } from "react";

const STATUSES = ["active", "completed", "archived"];

// Colour of the status pill and the stripe on the left of the card
const STATUS_STYLES = {
  active: { pill: "bg-brand-soft text-brand", stripe: "bg-brand" },
  completed: { pill: "bg-accent-soft text-accent", stripe: "bg-accent" },
  archived: { pill: "bg-line text-muted", stripe: "bg-line" },
};

// One project on the dashboard.
// canEdit = true for the owner (status dropdown + delete), false for the admin.
export default function ProjectCard({ project, canEdit, showOwner, onChanged }) {
  const [error, setError] = useState("");
  const style = STATUS_STYLES[project.status];

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
    <div className="panel relative flex flex-col overflow-hidden">
      <span className={`absolute inset-y-0 left-0 w-1 ${style.stripe}`} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-3 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/projects/${project.project_id}`}
            className="font-display text-lg font-semibold leading-snug hover:text-brand">
            {project.title}
          </Link>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.pill}`}>
            {project.status}
          </span>
        </div>

        {project.description && <p className="line-clamp-2 text-sm text-muted">{project.description}</p>}
        {showOwner && <p className="text-sm text-muted">Owner: {project.owner}</p>}

        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Sources</dt>
            <dd className="font-semibold">{project.source_count}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Citations</dt>
            <dd className="font-semibold">{project.citation_count}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Reading time</dt>
            <dd className="font-semibold">{project.total_minutes} min</dd>
          </div>
        </dl>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3 border-t border-line bg-canvas/60 px-5 py-2.5 pl-6 text-sm">
          <label className="flex items-center gap-2 text-muted">
            Status
            <select value={project.status} onChange={changeStatus}
              className="rounded-md border border-line bg-surface px-2 py-1 text-ink">
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

      {error && <p className="error-box m-4 mt-0">{error}</p>}
    </div>
  );
}