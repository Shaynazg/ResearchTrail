# ResearchTrail

ResearchTrail records how a piece of research unfolds. Each project holds the sources a researcher read (papers, articles, datasets, videos), the source that led to each one, which sources cite which, and who wrote them. The browse trail and the citation network are stored as two graphs in PostgreSQL, and pgvector adds similarity search over the sources.


## Features

- Sign up and log in, with two roles: **researcher** and **admin**
- Projects with live counts of sources, citations and reading time
- Sources with authors in order, tags, the source they came from and the sources they cite
- Every add or edit saved in one transaction, so a failed save leaves no partial data
- Clear error messages for every database rule
- Semantic search and similar sources using vector embeddings (in progress)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React, Tailwind CSS |
| Backend | Next.js API routes |
| Database | PostgreSQL 16 with pgvector |
| Auth | bcrypt password hashes, signed session cookie |

## Database features

- 8 tables with primary keys, foreign keys, CHECK and UNIQUE constraints
- Trigger that keeps each source's parent in the same project
- Recursive function for the browse path of any source
- View with per-project statistics
- Indexes, including an HNSW index for vector search
- Transactions for multi-table inserts, edits and deletes

## Status

Setup instructions will be added when the project is complete.