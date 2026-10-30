"use client";

// Filters for the project page: type, tag and a year range.
// They run in the browser on the sources the page already loaded, so no extra API call is needed.

export const NO_FILTERS = { type: "", tag: "", from: "", to: "" };

// True if a source passes every filter that is set (empty filters are skipped)
export function matchesFilters(source, filters) {
  if (filters.type && source.type !== filters.type) return false;
  if (filters.tag && !(source.tags ?? []).includes(filters.tag)) return false;

  const year = source.publication_year;
  if (filters.from !== "" && (year == null || year < Number(filters.from))) return false;
  if (filters.to !== "" && (year == null || year > Number(filters.to))) return false;
  return true;
}

// The dropdowns and year boxes. Only types and tags that appear in this project are offered.
export default function SourceFilters({ sources, filters, onChange }) {
  const types = [...new Set(sources.map((source) => source.type))].sort();
  const tags = [...new Set(sources.flatMap((source) => source.tags ?? []))].sort();
  const isFiltering = Object.values(filters).some((value) => value !== "");

  function set(name, value) {
    onChange({ ...filters, [name]: value });
  }

  return (
    <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
      <label className="block text-sm">
        <span className="font-medium">Type</span>
        <select value={filters.type} onChange={(event) => set("type", event.target.value)} className="field">
          <option value="">Any type</option>
          {types.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium">Tag</span>
        <select value={filters.tag} onChange={(event) => set("tag", event.target.value)} className="field">
          <option value="">Any tag</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm sm:w-24">
        <span className="font-medium">From year</span>
        <input type="number" value={filters.from} onChange={(event) => set("from", event.target.value)}
          className="field" />
      </label>

      <label className="block text-sm sm:w-24">
        <span className="font-medium">To year</span>
        <input type="number" value={filters.to} onChange={(event) => set("to", event.target.value)}
          className="field" />
      </label>

      {isFiltering && (
        <button type="button" onClick={() => onChange(NO_FILTERS)} className="btn-secondary col-span-2 sm:col-span-1">
          Clear
        </button>
      )}
    </div>
  );
}
