import { query } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { embedText, toVector } from "@/lib/embeddings";

const TYPES = ["paper", "article", "dataset", "website", "video", "book"];

// Empty text gives null, otherwise a whole number (NaN if it is not one)
function optionalInt(value) {
  if (value === null || value.trim() === "") return null;
  return Number(value);
}

// GET /api/search?q=...&project=&type=&tag=&from=&to=
// Semantic search: the query text is embedded with the same MiniLM model as the
// sources, and the sources whose embeddings are closest (cosine distance <=>)
// come back first. Filters are extra WHERE conditions; a filter left empty is skipped.
// Only projects the user may see are searched: their own, or every project for the admin.
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const params = request.nextUrl.searchParams;
  const text = (params.get("q") ?? "").trim();
  const projectId = optionalInt(params.get("project") ?? "");
  const type = params.get("type") || null;
  const tag = (params.get("tag") ?? "").trim().toLowerCase() || null;
  const fromYear = optionalInt(params.get("from") ?? "");
  const toYear = optionalInt(params.get("to") ?? "");

  if (!text) return Response.json({ error: "Type something to search for." }, { status: 400 });
  if (text.length > 500) return Response.json({ error: "Search text is too long." }, { status: 400 });
  if (type && !TYPES.includes(type)) return Response.json({ error: "Unknown type." }, { status: 400 });
  if ([projectId, fromYear, toYear].some(Number.isNaN)) {
    return Response.json({ error: "Project and years must be numbers." }, { status: 400 });
  }

  // Turn the search text into a vector (the slow part)
  let embedding;
  try {
    embedding = toVector(await embedText(text));
  } catch (error) {
    console.error("Search embedding failed:", error.message);
    return Response.json(
      { error: "Search is not available: the embedding model could not be loaded." },
      { status: 503 }
    );
  }

  const results = await query(
    `SELECT s.source_id, s.title, s.type, s.publication_year, s.abstract,
            p.project_id, p.title AS project_title,
            (SELECT COALESCE(array_agg(t.name ORDER BY t.name), '{}')
               FROM source_tags st JOIN tags t ON t.tag_id = st.tag_id
              WHERE st.source_id = s.source_id) AS tags,
            round((1 - (s.embedding <=> $1::vector))::numeric, 2)::float AS similarity
     FROM sources s
     JOIN projects p ON p.project_id = s.project_id
     WHERE s.embedding IS NOT NULL
       AND ($2 = 'admin' OR p.owner_id = $3)
       AND ($4::int  IS NULL OR s.project_id = $4)
       AND ($5::text IS NULL OR s.type = $5)
       AND ($6::text IS NULL OR EXISTS (
             SELECT 1 FROM source_tags st JOIN tags t ON t.tag_id = st.tag_id
             WHERE st.source_id = s.source_id AND t.name = $6))
       AND ($7::int  IS NULL OR s.publication_year >= $7)
       AND ($8::int  IS NULL OR s.publication_year <= $8)
     ORDER BY s.embedding <=> $1::vector
     LIMIT 10`,
    [embedding, user.role, user.userId, projectId, type, tag, fromYear, toYear]
  );

  return Response.json({ results });
}
