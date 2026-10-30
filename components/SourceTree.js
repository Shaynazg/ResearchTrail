import Link from "next/link";

// "Paper, 2017" from a source's type and year
function typeAndYear(source) {
  const type = source.type.charAt(0).toUpperCase() + source.type.slice(1);
  return source.publication_year ? `${type}, ${source.publication_year}` : type;
}

// Group sources by the source they came from (parent_source_id).
// Sources with no parent start a trail. Each group is in the order the sources were read.
function buildTree(sources) {
  const ids = new Set(sources.map((source) => source.source_id));
  const childrenOf = new Map();
  const roots = [];

  const byVisit = [...sources].sort((a, b) => new Date(a.visited_at) - new Date(b.visited_at));
  for (const source of byVisit) {
    const parent = source.parent_source_id;
    if (parent && ids.has(parent)) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(source);
    } else {
      roots.push(source);
    }
  }
  return { roots, childrenOf };
}

// One source and, indented below it, the sources that came from it
function TreeNode({ source, childrenOf, isMatch, filtering }) {
  const children = childrenOf.get(source.source_id) ?? [];
  const faded = filtering && !isMatch(source);

  return (
    <li>
      <div className={`flex gap-2 py-1.5 ${faded ? "opacity-40" : ""}`}>
        <span
          className={`mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
            filtering && !faded ? "border-brand bg-brand" : "border-brand bg-surface"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <Link href={`/sources/${source.source_id}`} className="font-medium hover:text-brand hover:underline">
            {source.title}
          </Link>
          <span className="ml-2 text-sm text-muted">
            {typeAndYear(source)}, {source.time_spent_min} min
            {source.cited_by_count > 0 && `, cited by ${source.cited_by_count}`}
          </span>
        </div>
      </div>

      {children.length > 0 && (
        <ul className="ml-[4px] border-l border-line pl-5">
          {children.map((child) => (
            <TreeNode key={child.source_id} source={child} childrenOf={childrenOf}
              isMatch={isMatch} filtering={filtering} />
          ))}
        </ul>
      )}
    </li>
  );
}

// The browse tree: every trail in the project as an indented outline.
// While filtering, every source stays in place but the ones that do not match are faded,
// so it is still clear where the matches sit in the trail.
export default function SourceTree({ sources, isMatch, filtering }) {
  const { roots, childrenOf } = buildTree(sources);

  return (
    <div className="panel space-y-4 p-5">
      {roots.map((root) => (
        <ul key={root.source_id}>
          <TreeNode source={root} childrenOf={childrenOf} isMatch={isMatch} filtering={filtering} />
        </ul>
      ))}
    </div>
  );
}
