/// <reference types="@cloudflare/workers-types" />
/**
 * Worker Cloudflare — API de persistance adossée à une base D1 (SQLite).
 *
 * Routes :
 *   GET  /api/profiles                       → liste tous les profils clients
 *   PUT  /api/profiles                       → remplace tous les profils
 *   GET  /api/{collection}?profile=<id>      → collection scopée par profil
 *   PUT  /api/{collection}?profile=<id>      → remplace la collection pour ce profil
 *
 * Les collections métier (`sessions`, `companies`, `notes`, `clients`,
 * `activities`) sont **cloisonnées par `profileId`**. Un PUT scopé
 * n'affecte QUE les lignes du profil demandé — les données des autres
 * profils sont intactes.
 */

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

/** Collections scopées par profil. */
const SCOPED_COLLECTIONS = [
  "sessions",
  "companies",
  "notes",
  "clients",
  "activities",
] as const;
type ScopedCollection = (typeof SCOPED_COLLECTIONS)[number];

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

/** En-têtes CORS : permet au front (Pages ou dev local) d'appeler l'API. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

/* ------------------------------------------------------------------ */
/* Routeur API                                                         */
/* ------------------------------------------------------------------ */

async function handleApi(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const segment = url.pathname.split("/")[2];
  await ensureSchema(env);

  // Migration : rattache toutes les lignes orphelines (profileId='') au
  // profil demandé. Idempotent : appels suivants n'affectent aucune ligne.
  // Utilisé au premier lancement de la version « multi-profils » pour
  // préserver les données saisies avant l'introduction des profils.
  if (segment === "adopt-orphans") {
    if (request.method !== "POST") {
      return json({ error: "POST attendu" }, 405);
    }
    const profileId = url.searchParams.get("profile");
    if (!profileId) return json({ error: "profile requis" }, 400);
    const counts = await adoptOrphans(env, profileId);
    return json({ ok: true, adopted: counts });
  }

  // Profils : endpoint spécial, non scopé.
  if (segment === "profiles") {
    if (request.method === "GET") return json(await readProfiles(env));
    if (request.method === "PUT") {
      const items = (await request.json()) as unknown[];
      if (!Array.isArray(items)) return json({ error: "Tableau attendu" }, 400);
      await replaceProfiles(env, items);
      return json({ ok: true, count: items.length });
    }
    return json({ error: "Méthode non autorisée" }, 405);
  }

  if (!SCOPED_COLLECTIONS.includes(segment as ScopedCollection)) {
    return json({ error: "Collection inconnue" }, 404);
  }
  const collection = segment as ScopedCollection;

  const profileId = url.searchParams.get("profile");
  if (!profileId) {
    return json({ error: "Paramètre `profile` requis" }, 400);
  }

  if (request.method === "GET") {
    return json(await readCollection(env, collection, profileId));
  }

  if (request.method === "PUT") {
    const items = (await request.json()) as unknown[];
    if (!Array.isArray(items)) return json({ error: "Tableau attendu" }, 400);
    await replaceCollection(env, collection, profileId, items);
    return json({ ok: true, count: items.length });
  }

  return json({ error: "Méthode non autorisée" }, 405);
}

/* ------------------------------------------------------------------ */
/* Migration : rattache les lignes orphelines à un profil               */
/* ------------------------------------------------------------------ */

/** UPDATE ... SET profileId=? WHERE profileId='' sur chaque collection.
 *  Retourne le nombre de lignes affectées par table. */
async function adoptOrphans(
  env: Env,
  profileId: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const col of SCOPED_COLLECTIONS) {
    const res = await env.DB.prepare(
      `UPDATE ${col} SET profileId = ? WHERE profileId = '' OR profileId IS NULL`
    )
      .bind(profileId)
      .run();
    counts[col] = res.meta.changes ?? 0;
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Profils (table dédiée, non scopée)                                  */
/* ------------------------------------------------------------------ */

async function readProfiles(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM profiles ORDER BY createdAt ASC`
  ).all<Record<string, unknown>>();
  return results;
}

async function replaceProfiles(env: Env, items: unknown[]): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM profiles`),
  ];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    statements.push(
      env.DB.prepare(
        `INSERT INTO profiles (id, name, color, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        item.name,
        item.color,
        item.createdAt,
        item.updatedAt
      )
    );
  }
  await env.DB.batch(statements);
}

/* ------------------------------------------------------------------ */
/* Collections scopées                                                 */
/* ------------------------------------------------------------------ */

async function readCollection(
  env: Env,
  collection: ScopedCollection,
  profileId: string
) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM ${collection} WHERE profileId = ?`
  )
    .bind(profileId)
    .all<Record<string, unknown>>();

  if (collection === "companies") {
    return results.map((row) => ({
      ...row,
      contacts: JSON.parse((row.contacts as string) || "[]"),
    }));
  }
  return results;
}

/** Remplace UNIQUEMENT les lignes du profil demandé. */
async function replaceCollection(
  env: Env,
  collection: ScopedCollection,
  profileId: string,
  items: unknown[]
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM ${collection} WHERE profileId = ?`).bind(
      profileId
    ),
  ];

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    statements.push(insertStatement(env, collection, profileId, item));
  }

  await env.DB.batch(statements);
}

function insertStatement(
  env: Env,
  collection: ScopedCollection,
  profileId: string,
  item: Record<string, unknown>
): D1PreparedStatement {
  switch (collection) {
    case "sessions":
      return env.DB.prepare(
        `INSERT INTO sessions (id, profileId, activity, startedAt, durationSec)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        profileId,
        item.activity,
        item.startedAt,
        item.durationSec
      );

    case "companies":
      return env.DB.prepare(
        `INSERT INTO companies (id, profileId, name, sector, status, notes, contacts, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        profileId,
        item.name,
        item.sector,
        item.status,
        item.notes,
        JSON.stringify(item.contacts ?? []),
        item.createdAt
      );

    case "notes":
      return env.DB.prepare(
        `INSERT INTO notes (id, profileId, category, title, contentHtml, groupName, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        profileId,
        item.category,
        item.title,
        item.contentHtml,
        (item.groupName as string | undefined) ?? "",
        (item.sortOrder as number | undefined) ?? 0,
        item.createdAt,
        item.updatedAt
      );

    case "clients":
      return env.DB.prepare(
        `INSERT INTO clients (id, profileId, firstName, lastName, role, phone, email, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        profileId,
        item.firstName,
        item.lastName,
        item.role,
        item.phone,
        item.email,
        item.notes,
        item.createdAt,
        item.updatedAt
      );

    case "activities":
      return env.DB.prepare(
        `INSERT INTO activities (id, profileId, label, color, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        profileId,
        item.label,
        item.color,
        item.createdAt,
        item.updatedAt
      );
  }
}

/* ------------------------------------------------------------------ */
/* Schéma (idempotent — créé à la volée)                               */
/* ------------------------------------------------------------------ */

async function ensureSchema(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt INTEGER,
        updatedAt INTEGER
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        profileId TEXT NOT NULL DEFAULT '',
        activity TEXT NOT NULL,
        startedAt INTEGER NOT NULL,
        durationSec INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        profileId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        sector TEXT,
        status TEXT,
        notes TEXT,
        contacts TEXT,
        createdAt INTEGER
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        profileId TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        title TEXT,
        contentHtml TEXT,
        groupName TEXT DEFAULT '',
        sortOrder INTEGER DEFAULT 0,
        createdAt INTEGER,
        updatedAt INTEGER
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        profileId TEXT NOT NULL DEFAULT '',
        firstName TEXT,
        lastName TEXT,
        role TEXT,
        phone TEXT,
        email TEXT,
        notes TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        profileId TEXT NOT NULL DEFAULT '',
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt INTEGER,
        updatedAt INTEGER
      )`
    ),
  ]);

  // Migration idempotente : SQLite n'a pas d'`ADD COLUMN IF NOT EXISTS`.
  const alters = [
    `ALTER TABLE notes ADD COLUMN groupName TEXT DEFAULT ''`,
    `ALTER TABLE notes ADD COLUMN sortOrder INTEGER DEFAULT 0`,
    `ALTER TABLE sessions ADD COLUMN profileId TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN profileId TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE notes ADD COLUMN profileId TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE clients ADD COLUMN profileId TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE activities ADD COLUMN profileId TEXT NOT NULL DEFAULT ''`,
  ];
  for (const sql of alters) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      // Colonne déjà présente : ignoré.
    }
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS },
  });
}
