-- Schéma D1 de l'application Nesis.
-- Le Worker crée déjà ces tables à la volée (ensureSchema) ; ce fichier
-- sert de référence et permet une initialisation manuelle :
--   wrangler d1 execute nesis-db --local --file=./worker/schema.sql   (dev)
--   wrangler d1 execute nesis-db --remote --file=./worker/schema.sql  (prod)

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  activity    TEXT NOT NULL,
  startedAt   INTEGER NOT NULL,
  durationSec INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  sector    TEXT,
  status    TEXT,
  notes     TEXT,
  contacts  TEXT,        -- tableau de contacts sérialisé en JSON
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,   -- 'sav' | 'demarchage'
  title       TEXT,
  contentHtml TEXT,
  createdAt   INTEGER,
  updatedAt   INTEGER
);
