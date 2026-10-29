import { pipeline } from "@huggingface/transformers";


// all-MiniLM-L6-v2 downloads from Hugging Face the first time it is used and is cached on disk after that. No API key is needed.
const MODEL = "Xenova/all-MiniLM-L6-v2";

function getExtractor() {
  if (!globalThis.embeddingExtractor) {
    globalThis.embeddingExtractor = pipeline("feature-extraction", MODEL, { dtype: "fp32" }).catch(
      (error) => {
        globalThis.embeddingExtractor = null;
        throw error;
      }
    );
  }
  return globalThis.embeddingExtractor;
}

// Text to an array of 384 numbers. 
export async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// The text that represents a source: its title, plus the abstract when there is one
export function sourceText({ title, abstract }) {
  return abstract ? `${title}. ${abstract}` : title;
}

export function toVector(numbers) {
  return JSON.stringify(numbers);
}

// Returns null if the model cannot be loaded (for example, no internet on the
// very first run), so the source is still saved; the backfill script fills it later.
export async function embedSource(source) {
  try {
    return toVector(await embedText(sourceText(source)));
  } catch (error) {
    console.error("Embedding failed, saving the source without one:", error.message);
    return null;
  }
}