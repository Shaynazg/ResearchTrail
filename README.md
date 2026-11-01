# ResearchTrail

**Never lose track of how your research came together.**

Research rarely goes in a straight line. One paper leads to another, which cites three more. ResearchTrail keeps that path for each project: what you read, which source led you to it, who wrote it and what it cites. PostgreSQL stores the reading trail and the citation links as two connected graphs, and pgvector lets you find sources by what they are about.
## Features

**For researchers**

- Sign up and log in
- Create projects and mark them active, completed or archived
- Add sources with authors in order, tags, the source they came from, the sources they cite, reading time, an abstract and a note
- See each project as a **browse tree** (every source sits under the one that led to it) or as a list, filtered by type, tag and year
- Open any source to see its **trail** from the start, what it cites, what cites it, and **similar sources**
- **Semantic search**: describe a topic in plain words and get the closest sources by meaning, with filters for project, type, tag and year

**For the admin**

- Site-wide totals, sources by type, popular tags and the most-cited sources
- A table of every user with their projects, sources and reading time
- View every project (read-only) and delete researcher accounts

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API routes |
| Database | PostgreSQL 16 with pgvector, run in Docker |
| Embeddings | all-MiniLM-L6-v2 (384 numbers per source) run locally with Transformers.js, no API key |
| Auth | bcrypt password hashes, signed session cookie (JWT) |

## Database design

| Table | What it holds |
|---|---|
| `users` | Accounts with a role: researcher or admin |
| `projects` | A research project owned by one user |
| `sources` | Everything read for a project. `parent_source_id` points to the source that led to it (the browse tree), and `embedding` holds its vector |
| `authors` | Author names, shared across sources |
| `tags` | Lowercase tag names |
| `citations` | Which source cites which (the citation graph) |
| `source_authors` | Links sources to authors, in order |
| `source_tags` | Links sources to tags |

What the database does itself:

- **Constraints**: primary and foreign keys, CHECK rules (valid URL, year between 1450 and 2100, allowed types, no negative time, no source citing itself) and UNIQUE rules (one account per email, no duplicate URL in a project)
- **Trigger** `trg_parent_project`: a source's parent must be in the same project
- **Recursive function** `get_browse_path()`: the trail from the start to any source
- **View** `v_project_stats`: sources, citations and reading time per project
- **Indexes**, including an **HNSW index** for fast vector search
- **Transactions**: adding, editing and deleting a source each run as one transaction, so a failed save leaves nothing half done
- **ON DELETE CASCADE**: deleting a project or user removes everything under it
- **Recursive query** when editing a source, so it cannot be moved under one of its own descendants

Every database error is turned into a clear message for the user.

## How semantic search works

1. When a source is saved, its title and abstract are turned into 384 numbers (an embedding) by the MiniLM model and stored in `sources.embedding`.
2. A search turns the search text into an embedding in the same way.
3. PostgreSQL orders sources by cosine distance (`<=>`), so the closest in meaning come first. Similarity is shown as `1 - distance`. Users only ever see sources from projects they are allowed to view.

## Project structure

```
app/(auth)/          login and signup pages
app/(main)/          dashboard, project, source, search and admin pages
app/api/             API routes (auth, projects, sources, search, admin)
components/          shared UI (header, forms, browse tree, filters)
lib/                 database, auth, embeddings and error helpers
db/researchtrail.sql the full schema and demo data
scripts/             backfill script that creates embeddings for every source
proxy.js             sends logged-out users to /login and non-admins away from /admin
```

## Setup on Windows

Use **Command Prompt** for every command.

### 1. Install the tools

- **Git** from git-scm.com
- **Node.js 20 or newer** from nodejs.org
- **Docker Desktop** from docker.com. Open it and wait until it says **Engine running**.

### 2. Get the code

```
git clone https://github.com/Shaynazg/ResearchTrail.git
cd ResearchTrail
npm install
```

### 3. Create the environment file

```
copy .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Open `.env.local` and fill in:

```
DB_PASSWORD=pick-any-password
DATABASE_URL=postgres://postgres:pick-any-password@localhost:5432/researchtrail
SESSION_SECRET=paste-the-64-characters-printed-above
```

The password must be the same in both places. `.env.local` is never committed.

### 4. Start the database

```
docker compose --env-file .env.local up -d
```

The first start downloads PostgreSQL with pgvector and runs `db/researchtrail.sql`, which creates the tables and loads the demo data.

### 5. Create the embeddings

```
npm run embeddings
```

The demo data comes with placeholder vectors, and this replaces them with real ones. The first run downloads the model (about 90 MB) and needs internet. Run it again after every database reset.

### 6. Start the app

```
npm run dev
```

Open http://localhost:3000 and log in with a demo account below.

### Every day after that

```
docker compose --env-file .env.local up -d
npm run dev
```

### Reset the database to the demo data

```
docker compose --env-file .env.local down -v
docker compose --env-file .env.local up -d
npm run embeddings
```

### Common problems

| Problem | Fix |
|---|---|
| `ECONNREFUSED` on any page | The database is not running. Open Docker Desktop and start it (step 4) |
| `password authentication failed` | The two passwords in `.env.local` do not match. Fix them, then reset the database |
| Port 5432 already in use | Another PostgreSQL is running. Stop it, or change `"5432:5432"` to `"5433:5432"` in `docker-compose.yml` and use port 5433 in `DATABASE_URL` |
| `npm run embeddings` says `fetch failed` | The network is blocking huggingface.co. Try another network, such as a phone hotspot |
| `running scripts is disabled` | Use Command Prompt instead of PowerShell |

## Demo logins

All demo accounts use the password **`Demo@1234`**.

| Email | Role | Owns |
|---|---|---|
| admin@researchtrail.dev | Admin | Nothing (sees every project, read-only) |
| ananya.rao@pesu.edu | Researcher | Transformers and attention |
| rohan.mehta@pesu.edu | Researcher | Climate tipping points |

New accounts made on the signup page are always researchers.

## Team

| Name | SRN | Worked on |
|---|---|---|
| Sharanya C Bharadwaj | PES2UG24CS458 | Database schema, Demo data, app setup, login and roles, projects and sources (add, edit, delete)|
| Shayna Zaidi Gupta | PES2UG24CS465 | Database schema, embeddings and semantic search, source page, browse tree and filters, admin page |
