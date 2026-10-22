-- ResearchTrail : complete database script (DDL + DML)
-- PostgreSQL 14+ with the pgvector extension
-- Run: psql -U postgres -d researchtrail -f researchtrail.sql
-- Re-running is safe: section 1 drops everything first.
-- Demo password for all users: Demo@1234 (stored as a bcrypt hash)

\set ON_ERROR_STOP on

-- 1. RESET (DROP)
DROP TABLE IF EXISTS source_tags, source_authors, citations, tags,
                     authors, sources, projects, users CASCADE;

CREATE EXTENSION IF NOT EXISTS vector;    -- pgvector: vector type + <=> operator


-- 2. TABLES (CREATE) - 5 entities + 3 many-to-many junction tables

CREATE TABLE users (
    user_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE CHECK (email LIKE '%_@_%._%'),
    password_hash  TEXT NOT NULL,                                  -- bcrypt, never plain text
    role           VARCHAR(20) NOT NULL DEFAULT 'researcher'
                   CHECK (role IN ('researcher', 'admin')),
    institution    VARCHAR(150),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    project_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    description  TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'archived')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- parent_source_id = the source that led here (browse-path tree, graph 1)
CREATE TABLE sources (
    source_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id        INT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    parent_source_id  INT REFERENCES sources(source_id) ON DELETE SET NULL,
    title             VARCHAR(500) NOT NULL CHECK (length(trim(title)) > 0),
    url               TEXT CHECK (url LIKE 'http%'),
    type              VARCHAR(20) NOT NULL DEFAULT 'paper'
                      CHECK (type IN ('paper', 'article', 'dataset', 'website', 'video', 'book')),
    abstract          TEXT,
    note              TEXT,
    publication_year  INT CHECK (publication_year BETWEEN 1450 AND 2100),
    visited_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_spent_min    INT NOT NULL DEFAULT 0 CHECK (time_spent_min >= 0),
    CHECK (parent_source_id <> source_id),
    UNIQUE (project_id, url)                       -- same URL only once per project
);

CREATE TABLE authors (
    author_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_name  VARCHAR(200) NOT NULL UNIQUE,
    affiliation  VARCHAR(200)
);

CREATE TABLE tags (
    tag_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name    VARCHAR(50) NOT NULL UNIQUE CHECK (name = lower(name))
);

-- Citation graph (graph 2): which source formally cites which
CREATE TABLE citations (
    citing_source_id  INT REFERENCES sources(source_id) ON DELETE CASCADE,
    cited_source_id   INT REFERENCES sources(source_id) ON DELETE CASCADE,
    PRIMARY KEY (citing_source_id, cited_source_id),
    CHECK (citing_source_id <> cited_source_id)
);

CREATE TABLE source_authors (
    source_id     INT REFERENCES sources(source_id) ON DELETE CASCADE,
    author_id     INT REFERENCES authors(author_id) ON DELETE RESTRICT,
    author_order  INT NOT NULL CHECK (author_order >= 1),
    PRIMARY KEY (source_id, author_id),
    UNIQUE (source_id, author_order)
);

CREATE TABLE source_tags (
    source_id  INT REFERENCES sources(source_id) ON DELETE CASCADE,
    tag_id     INT REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (source_id, tag_id)
);


-- 3. ALTER: add the vector column
-- 384 = size of all-MiniLM-L6-v2 embeddings of title + abstract,
-- which the Next.js app generates.
ALTER TABLE sources ADD COLUMN embedding vector(384);

-- 4. INDEXES
CREATE INDEX idx_sources_project ON sources (project_id);
CREATE INDEX idx_sources_parent  ON sources (parent_source_id);      -- tree traversal
CREATE INDEX idx_citations_cited ON citations (cited_source_id);     -- "cited by" lookups
CREATE INDEX idx_sources_embedding ON sources
    USING hnsw (embedding vector_cosine_ops);                        -- vector similarity search


-- 5. TRIGGER: a parent source must be in the same project as its child
CREATE OR REPLACE FUNCTION check_parent_project() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.parent_source_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM sources
        WHERE source_id = NEW.parent_source_id AND project_id = NEW.project_id
    ) THEN
        RAISE EXCEPTION 'Parent source % is not in project %',
                        NEW.parent_source_id, NEW.project_id;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_parent_project
BEFORE INSERT OR UPDATE OF parent_source_id ON sources
FOR EACH ROW EXECUTE FUNCTION check_parent_project();


-- 6. FUNCTION: browse path from the root to a source (recursive CTE)
CREATE OR REPLACE FUNCTION get_browse_path(p_source INT)
RETURNS TABLE (step INT, source_id INT, title VARCHAR)
LANGUAGE sql AS $$
    WITH RECURSIVE path AS (
        SELECT s.source_id, s.title, s.parent_source_id, 0 AS up
        FROM sources s WHERE s.source_id = p_source
        UNION ALL
        SELECT s.source_id, s.title, s.parent_source_id, p.up + 1
        FROM sources s JOIN path p ON s.source_id = p.parent_source_id
    )
    SELECT (MAX(up) OVER () - up)::int, source_id, title
    FROM path ORDER BY 1;
$$;


-- 7. VIEW: per-project statistics for the dashboard
CREATE VIEW v_project_stats AS
SELECT p.project_id, p.title, u.name AS owner, p.status,
       COUNT(s.source_id)                  AS source_count,
       COALESCE(SUM(s.time_spent_min), 0)  AS total_minutes,
       (SELECT COUNT(*) FROM citations c
          JOIN sources cs ON cs.source_id = c.citing_source_id
         WHERE cs.project_id = p.project_id) AS citation_count
FROM projects p
JOIN users u        ON u.user_id = p.owner_id
LEFT JOIN sources s ON s.project_id = p.project_id
GROUP BY p.project_id, u.name;


-- DML

-- 8. SEED DATA (INSERT) - IDs are assigned 1, 2, 3... in insert order
INSERT INTO users (name, email, password_hash, role, institution) VALUES
('Site Admin',  'admin@researchtrail.dev', '$2b$12$uhJQ5rRyeVPBIq8EJJJ18e6YMeH/o5WeyWGt7UhJePHJTidRWK7zC', 'admin',      NULL),             -- 1
('Ananya Rao',  'ananya.rao@pesu.edu',     '$2b$12$Ul0VRuzEW3p4Pog5jYgsb.vUgdx7X67Rt5mJENQt.p4R5xKaz2wgG', 'researcher', 'PES University'), -- 2
('Rohan Mehta', 'rohan.mehta@pesu.edu',    '$2b$12$QDmYpnv7wpAPXyiI7GQy/.Kb5i7ccnmEIKTZq3bmNkFSyveFvtVga', 'researcher', 'PES University'); -- 3

INSERT INTO projects (owner_id, title, description) VALUES
(2, 'Transformers and attention', 'How attention replaced recurrence in sequence models.'),   -- 1
(3, 'Climate tipping points',     'Evidence for abrupt changes such as an AMOC collapse.');   -- 2

-- (project, parent, title, url, type, abstract, note, year, visited_at, minutes)
INSERT INTO sources (project_id, parent_source_id, title, url, type, abstract, note,
                     publication_year, visited_at, time_spent_min) VALUES
(1, NULL, 'The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/', 'website',
    'Visual walkthrough of self-attention, multi-head attention and the encoder-decoder stack.',
    'Start here.', 2018, '2026-07-01 10:00+05:30', 35),                                                   -- 1
(1, 1, 'Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', 'paper',
    'Introduces the Transformer, built only from attention layers, removing recurrence.',
    'Core paper.', 2017, '2026-07-01 11:00+05:30', 120),                                                  -- 2
(1, 2, 'Neural Machine Translation by Jointly Learning to Align and Translate', 'https://arxiv.org/abs/1409.0473', 'paper',
    'Adds a soft attention mechanism to an RNN encoder-decoder for translation.',
    'Where attention began.', 2014, '2026-07-02 09:30+05:30', 75),                                        -- 3
(1, 3, 'Sequence to Sequence Learning with Neural Networks', 'https://arxiv.org/abs/1409.3215', 'paper',
    'Uses one LSTM to encode a sentence and another LSTM to decode it.',
    NULL, 2014, '2026-07-02 11:00+05:30', 50),                                                            -- 4
(1, 4, 'Long Short-Term Memory', NULL, 'paper',
    'Proposes the LSTM cell with gated memory for long time lags in recurrent networks.',
    NULL, 1997, '2026-07-02 14:00+05:30', 40),                                                            -- 5
(1, 2, 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', 'https://arxiv.org/abs/1810.04805', 'paper',
    'Pre-trains a bidirectional Transformer encoder with masked language modelling.',
    'Masked LM objective.', 2018, '2026-07-04 09:00+05:30', 110),                                         -- 6
(1, 6, 'RoBERTa: A Robustly Optimized BERT Pretraining Approach', 'https://arxiv.org/abs/1907.11692', 'paper',
    'Shows BERT was undertrained; more data and dynamic masking give large gains.',
    NULL, 2019, '2026-07-05 10:00+05:30', 40),                                                            -- 7
(1, 2, 'Language Models are Few-Shot Learners', 'https://arxiv.org/abs/2005.14165', 'paper',
    'GPT-3: a large language model that learns tasks from a few examples in the prompt.',
    'Read sections 1-3.', 2020, '2026-07-08 09:00+05:30', 150),                                           -- 8
(1, NULL, 'The Annotated Transformer', 'https://nlp.seas.harvard.edu/annotated-transformer/', 'website',
    'Line-by-line PyTorch implementation of the Transformer paper.',
    'For later.', 2018, '2026-07-09 21:00+05:30', 15),                                                    -- 9
(2, NULL, 'Climate tipping points - too risky to bet against', 'https://doi.org/10.1038/d41586-019-03595-0', 'article',
    'Argues several tipping elements may be close to activation and could cascade.',
    'Entry point.', 2019, '2026-07-10 10:00+05:30', 30),                                                  -- 10
(2, 10, 'Tipping elements in the Earth''s climate system', 'https://doi.org/10.1073/pnas.0705414105', 'paper',
    'Defines tipping elements and which climate components could pass a threshold.',
    'The classic list.', 2008, '2026-07-11 09:00+05:30', 90),                                             -- 11
(2, 11, 'Exceeding 1.5C global warming could trigger multiple climate tipping points', 'https://doi.org/10.1126/science.abn7950', 'paper',
    'Updated assessment: several tipping points become likely within the Paris range.',
    NULL, 2022, '2026-07-12 10:00+05:30', 85),                                                            -- 12
(2, 11, 'Observation-based early-warning signals for a collapse of the AMOC', 'https://doi.org/10.1038/s41558-021-01097-4', 'paper',
    'Finds early-warning signals of lost stability in the Atlantic overturning circulation.',
    NULL, 2021, '2026-07-13 11:00+05:30', 60);                                                            -- 13

INSERT INTO authors (author_name) VALUES
('Jay Alammar'), ('Ashish Vaswani'), ('Noam Shazeer'), ('Dzmitry Bahdanau'),          -- 1-4
('Kyunghyun Cho'), ('Yoshua Bengio'), ('Ilya Sutskever'), ('Oriol Vinyals'),          -- 5-8
('Quoc V. Le'), ('Sepp Hochreiter'), ('Jürgen Schmidhuber'), ('Jacob Devlin'),        -- 9-12
('Ming-Wei Chang'), ('Yinhan Liu'), ('Myle Ott'), ('Tom B. Brown'),                   -- 13-16
('Benjamin Mann'), ('Alexander M. Rush'), ('Timothy M. Lenton'), ('Johan Rockström'), -- 17-20
('Hermann Held'), ('David I. Armstrong McKay'), ('Arie Staal'), ('Niklas Boers');     -- 21-24

INSERT INTO source_authors (source_id, author_id, author_order) VALUES
(1,1,1), (2,2,1), (2,3,2), (3,4,1), (3,5,2), (3,6,3), (4,7,1), (4,8,2), (4,9,3),
(5,10,1), (5,11,2), (6,12,1), (6,13,2), (7,14,1), (7,15,2), (8,16,1), (8,17,2),
(9,18,1), (10,19,1), (10,20,2), (11,19,1), (11,21,2), (12,22,1), (12,23,2), (13,24,1);

INSERT INTO tags (name) VALUES
('transformers'), ('attention'), ('nlp'), ('rnn'), ('pretraining'),    -- 1-5
('tutorial'), ('climate'), ('tipping-points'), ('amoc');               -- 6-9

INSERT INTO source_tags (source_id, tag_id) VALUES
(1,1), (1,2), (1,6), (2,1), (2,2), (2,3), (3,2), (3,3), (3,4), (4,3), (4,4),
(5,4), (6,1), (6,3), (6,5), (7,1), (7,5), (8,1), (8,5), (9,1), (9,6),
(10,7), (10,8), (11,7), (11,8), (12,7), (12,8), (13,7), (13,9);

INSERT INTO citations (citing_source_id, cited_source_id) VALUES
(1,2), (2,3), (2,4), (2,5), (3,4), (4,5), (6,2), (7,2), (7,6), (8,2), (8,6), (8,7),
(10,11), (12,10), (12,11), (12,13), (13,11);


-- 9. TRANSACTIONS
-- 9a. COMMIT: a new source with its authors, tags and citation, all or nothing
BEGIN;
INSERT INTO sources (project_id, parent_source_id, title, url, abstract, publication_year, time_spent_min)
VALUES (1, 2, 'Generating Long Sequences with Sparse Transformers', 'https://arxiv.org/abs/1904.10509',
        'Factorises attention into sparse patterns to model very long sequences.', 2019, 40);

INSERT INTO authors (author_name) VALUES ('Rewon Child'), ('Scott Gray'), ('Alec Radford')
ON CONFLICT (author_name) DO NOTHING;

INSERT INTO source_authors (source_id, author_id, author_order)
SELECT s.source_id, a.author_id, x.ord
FROM sources s,
     (VALUES ('Rewon Child', 1), ('Scott Gray', 2), ('Alec Radford', 3), ('Ilya Sutskever', 4)) AS x(name, ord)
     JOIN authors a ON a.author_name = x.name
WHERE s.url = 'https://arxiv.org/abs/1904.10509';

INSERT INTO source_tags (source_id, tag_id)
SELECT s.source_id, t.tag_id FROM sources s, tags t
WHERE s.url = 'https://arxiv.org/abs/1904.10509' AND t.name IN ('transformers', 'attention');

INSERT INTO citations (citing_source_id, cited_source_id)
SELECT source_id, 2 FROM sources WHERE url = 'https://arxiv.org/abs/1904.10509';
COMMIT;

-- 9b. ROLLBACK: an accidental delete is undone
BEGIN;
DELETE FROM citations;
ROLLBACK;
SELECT COUNT(*) AS citations_after_rollback FROM citations;   -- still 18


-- ---------------------------------------------------------------------
-- 10. UPDATE
-- ---------------------------------------------------------------------
UPDATE sources SET note = 'Masked LM objective. Compare with RoBERTa.' WHERE source_id = 6;
UPDATE sources SET parent_source_id = 2 WHERE source_id = 7;      -- move RoBERTa in the tree
UPDATE projects SET status = 'completed' WHERE project_id = 2;

-- Demo embeddings so vector search can be tested in psql: a simple
-- word-hashing vector of title + abstract. The app replaces these
-- with real MiniLM embeddings.
UPDATE sources s
SET embedding = (
    SELECT array_agg(
             (SELECT COUNT(*)
              FROM unnest(to_tsvector('english', s.title || ' ' || coalesce(s.abstract, ''))) w
              WHERE (hashtext(w.lexeme)::bigint % 384 + 384) % 384 = d)::real
           ORDER BY d)::vector
    FROM generate_series(0, 383) AS d
);

-- Trigger test (uncomment to see it fail: source 1 is not in project 2)
-- INSERT INTO sources (project_id, parent_source_id, title) VALUES (2, 1, 'Wrong project');


-- 11. SELECT QUERIES
-- Q1 Dashboard (view)
SELECT * FROM v_project_stats ORDER BY project_id;

-- Q2 Source list with authors (JOIN, aggregate, ORDER BY)
SELECT s.source_id, s.title,
       string_agg(a.author_name, ', ' ORDER BY sa.author_order) AS authors
FROM sources s
JOIN source_authors sa ON sa.source_id = s.source_id
JOIN authors a         ON a.author_id  = sa.author_id
WHERE s.project_id = 1
GROUP BY s.source_id, s.title
ORDER BY s.source_id;

-- Q3 Most-cited sources (JOIN, GROUP BY, COUNT)
SELECT s.title, COUNT(*) AS times_cited
FROM citations c
JOIN sources s ON s.source_id = c.cited_source_id
GROUP BY s.source_id, s.title
ORDER BY times_cited DESC
LIMIT 5;

-- Q4 Tags used on at least 3 sources (HAVING)
SELECT t.name, COUNT(*) AS uses
FROM source_tags st
JOIN tags t ON t.tag_id = st.tag_id
GROUP BY t.name
HAVING COUNT(*) >= 3
ORDER BY uses DESC;

-- Q5 Authors who appear on more than one source (HAVING)
SELECT a.author_name, COUNT(*) AS sources
FROM authors a
JOIN source_authors sa ON sa.author_id = a.author_id
GROUP BY a.author_name
HAVING COUNT(*) > 1;

-- Q6 Sources read longer than their project's average (correlated subquery)
SELECT s.title, s.time_spent_min
FROM sources s
WHERE s.time_spent_min > (SELECT AVG(time_spent_min) FROM sources
                          WHERE project_id = s.project_id)
ORDER BY s.time_spent_min DESC;

-- Q7 Isolated sources: not cited, cite nothing, lead nowhere (NOT EXISTS)
SELECT s.source_id, s.title
FROM sources s
WHERE NOT EXISTS (SELECT 1 FROM citations c WHERE c.cited_source_id  = s.source_id)
  AND NOT EXISTS (SELECT 1 FROM citations c WHERE c.citing_source_id = s.source_id)
  AND NOT EXISTS (SELECT 1 FROM sources ch  WHERE ch.parent_source_id = s.source_id);

-- Q8 Browse path to a source (recursive function)
SELECT * FROM get_browse_path(5);

-- Q9 Sources most similar to source 2 (vector cosine distance <=>)
--    The app runs the same query with a search box's embedding as $1::vector.
SELECT s.source_id, s.title,
       round((1 - (s.embedding <=> t.embedding))::numeric, 3) AS similarity
FROM sources s, sources t
WHERE t.source_id = 2 AND s.source_id <> 2
ORDER BY s.embedding <=> t.embedding
LIMIT 5;


-- ---------------------------------------------------------------------
-- 12. DELETE
-- ---------------------------------------------------------------------
-- Removing a source deletes its citations and tag/author links (CASCADE);
-- its child source becomes a root (SET NULL).
DELETE FROM source_tags WHERE source_id = 9 AND tag_id = 6;
DELETE FROM sources WHERE source_id = 4;
SELECT source_id, parent_source_id, title FROM sources WHERE source_id = 5;
