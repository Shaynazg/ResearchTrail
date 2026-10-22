"use client";

import { useState } from "react";

const TYPES = ["paper", "article", "dataset", "website", "video", "book"];

const inputClass = "field";

// Form for adding and editing a source.
// sources  = the other sources in this project (for "came from" and "cites")
// initial  = starting values when editing (empty when adding)
// onSubmit = async function(data) that returns an error message, or null on success
export default function SourceForm({ sources, initial = {}, submitLabel, onSubmit }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cites, setCites] = useState(initial.cites ?? []);

  function toggleCite(sourceId) {
    setCites((current) =>
      current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const message = await onSubmit({
      title: form.get("title"),
      url: form.get("url"),
      type: form.get("type"),
      publication_year: form.get("publication_year"),
      time_spent_min: form.get("time_spent_min"),
      authors: form.get("authors"),
      tags: form.get("tags"),
      parent_source_id: form.get("parent_source_id"),
      abstract: form.get("abstract"),
      note: form.get("note"),
      cites,
    });

    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={handleSubmit} className="panel space-y-5 p-6">
      <label className="block">
        <span className="text-sm font-medium">Title *</span>
        <input name="title" required maxLength={500} defaultValue={initial.title} className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">URL</span>
          <input name="url" defaultValue={initial.url ?? ""} placeholder="https://..." className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Type</span>
          <select name="type" defaultValue={initial.type ?? "paper"} className={inputClass}>
            {TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Publication year</span>
          <input name="publication_year" type="number" defaultValue={initial.publication_year ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Time spent (minutes)</span>
          <input name="time_spent_min" type="number" defaultValue={initial.time_spent_min ?? 0} className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Authors (comma-separated, in order)</span>
        <input name="authors" defaultValue={initial.authors ?? ""} placeholder="Ashish Vaswani, Noam Shazeer"
          className={inputClass} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Tags (comma-separated)</span>
        <input name="tags" defaultValue={(initial.tags ?? []).join(", ")} placeholder="transformers, attention"
          className={inputClass} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Came from (the source that led you here)</span>
        <select name="parent_source_id" defaultValue={initial.parent_source_id ?? ""} className={inputClass}>
          <option value="">None: this starts a new trail</option>
          {sources.map((source) => (
            <option key={source.source_id} value={source.source_id}>{source.title}</option>
          ))}
        </select>
      </label>

      {sources.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium">Cites (sources in this project it references)</legend>
          <div className="mt-1 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-line p-3">
            {sources.map((source) => (
              <label key={source.source_id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={cites.includes(source.source_id)}
                  onChange={() => toggleCite(source.source_id)} className="mt-1 accent-[var(--brand)]" />
                {source.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block">
        <span className="text-sm font-medium">Abstract</span>
        <textarea name="abstract" rows={3} defaultValue={initial.abstract ?? ""} className={inputClass} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Your note</span>
        <textarea name="note" rows={2} defaultValue={initial.note ?? ""} className={inputClass} />
      </label>

      {error && <p className="error-box">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}