// Shared code for creating and editing sources

// Split "a, b, c" into ["a", "b", "c"]: trimmed, no blanks, no repeats
function splitList(text) {
  const items = String(text ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return [...new Set(items)];
}

// Empty input gives null, otherwise a whole number (NaN if it is not one)
function optionalInt(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return Number(value);
}

// Read and clean the form fields sent by SourceForm.
// Returns { error } if something is obviously wrong, otherwise { values }.
export function parseSourceBody(body) {
  const values = {
    title: String(body.title ?? "").trim(),
    url: String(body.url ?? "").trim() || null,
    type: String(body.type ?? "paper"),
    abstract: String(body.abstract ?? "").trim() || null,
    note: String(body.note ?? "").trim() || null,
    year: optionalInt(body.publication_year),
    minutes: optionalInt(body.time_spent_min) ?? 0,
    parentId: optionalInt(body.parent_source_id),
    authors: splitList(body.authors),
    tags: splitList(String(body.tags ?? "").toLowerCase()),
    cites: (Array.isArray(body.cites) ? body.cites : []).map(Number).filter(Number.isInteger),
  };

  if (!values.title) return { error: "Title is required." };
  if ([values.year, values.minutes, values.parentId].some(Number.isNaN)) {
    return { error: "Year, time spent and parent must be numbers." };
  }
  return { values };
}

// Save a source's authors, tags and citations. Runs inside the caller's transaction (client).
// Any old links must already be deleted when editing.
export async function saveSourceLinks(client, sourceId, projectId, { authors, tags, cites }) {
  // Authors, in the order typed. Existing authors are reused, new ones created.
  for (const [index, name] of authors.entries()) {
    const author = await client.query(
      `INSERT INTO authors (author_name) VALUES ($1)
       ON CONFLICT (author_name) DO UPDATE SET author_name = EXCLUDED.author_name
       RETURNING author_id`,
      [name]
    );
    await client.query(
      "INSERT INTO source_authors (source_id, author_id, author_order) VALUES ($1, $2, $3)",
      [sourceId, author.rows[0].author_id, index + 1]
    );
  }

  // Tags: create any that do not exist yet, then link them all
  if (tags.length > 0) {
    await client.query(
      "INSERT INTO tags (name) SELECT unnest($1::varchar[]) ON CONFLICT (name) DO NOTHING",
      [tags]
    );
    await client.query(
      `INSERT INTO source_tags (source_id, tag_id)
       SELECT $1, tag_id FROM tags WHERE name = ANY($2::varchar[])`,
      [sourceId, tags]
    );
  }

  // Citations: only to other sources in the same project
  if (cites.length > 0) {
    await client.query(
      `INSERT INTO citations (citing_source_id, cited_source_id)
       SELECT $1, source_id FROM sources
       WHERE project_id = $2 AND source_id = ANY($3::int[]) AND source_id <> $1`,
      [sourceId, projectId, cites]
    );
  }
}