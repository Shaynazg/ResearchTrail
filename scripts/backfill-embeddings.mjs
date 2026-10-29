
import pg from "pg";
import { embedText, sourceText, toVector } from "../lib/embeddings.js";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows: sources } = await client.query(
    "SELECT source_id, title, abstract FROM sources ORDER BY source_id"
  );
  console.log(`Embedding ${sources.length} sources...`);

  for (const source of sources) {
    const embedding = toVector(await embedText(sourceText(source)));
    await client.query("UPDATE sources SET embedding = $1::vector WHERE source_id = $2", [
      embedding,
      source.source_id,
    ]);
    console.log(`  ${source.source_id}. ${source.title}`);
  }

  console.log("Done.");
} finally {
  await client.end();
}
