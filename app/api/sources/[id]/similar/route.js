import { query } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { readId, getSourceForUser } from "@/lib/projects";

// GET /api/sources/:id/similar
// The 5 sources closest in meaning to this one (vector similarity search).
// <=> is pgvector's cosine distance (0 = same meaning); similarity = 1 - distance,
// so a higher similarity means more alike. The HNSW index makes the ORDER BY fast.
// Only projects the user may see are searched: their own, or every project for the admin.
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const sourceId = await readId(params);
  const source = sourceId && (await getSourceForUser(sourceId, user));
  if (!source) return Response.json({ error: "Source not found." }, { status: 404 });

  // No embedding yet (e.g. the model could not load when it was saved)
  if (!source.embedding) return Response.json({ similar: [], hasEmbedding: false });

  const similar = await query(
    `SELECT s.source_id, s.title, s.type, s.publication_year,
            p.project_id, p.title AS project_title,
            round((1 - (s.embedding <=> t.embedding))::numeric, 2)::float AS similarity
     FROM sources t
     JOIN sources s  ON s.source_id <> t.source_id AND s.embedding IS NOT NULL
     JOIN projects p ON p.project_id = s.project_id
     WHERE t.source_id = $1
       AND ($2 = 'admin' OR p.owner_id = $3)
     ORDER BY s.embedding <=> t.embedding
     LIMIT 5`,
    [sourceId, user.role, user.userId]
  );

  return Response.json({ similar, hasEmbedding: true });
}
