/// <reference types="@cloudflare/workers-types" />
/**
 * Worker Cloudflare — API de persistance adossée à une base D1 (SQLite).
 *
 * Routes :
 *   GET  /api/{sessions|companies|notes}  → renvoie toute la collection
 *   PUT  /api/{sessions|companies|notes}  → remplace toute la collection
 *
 * Le front utilise une API « bulk » (voir StorageAdapter) : chaque PUT
 * remplace l'intégralité de la table dans une transaction (batch D1).
 * Simple et suffisant pour un outil interne mono-utilisateur ; à faire
 * évoluer vers du CRUD granulaire si plusieurs utilisateurs écrivent
 * simultanément.
 *
 * Tout le reste du trafic est servi comme SPA statique (assets) en prod ;
 * en dev, c'est Vite qui sert le front et proxifie /api vers ce Worker.
 */

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const COLLECTIONS = ["sessions", "companies", "notes", "clients"] as const;
type Collection = (typeof COLLECTIONS)[number];

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // En production : sert l'application (build Vite) via le binding assets.
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
  const collection = url.pathname.split("/")[2] as Collection;
  if (!COLLECTIONS.includes(collection)) {
    return json({ error: "Collection inconnue" }, 404);
  }

  await ensureSchema(env);

  if (request.method === "GET") {
    return json(await readCollection(env, collection));
  }

  if (request.method === "PUT") {
    const items = (await request.json()) as unknown[];
    if (!Array.isArray(items)) return json({ error: "Tableau attendu" }, 400);
    await replaceCollection(env, collection, items);
    return json({ ok: true, count: items.length });
  }

  return json({ error: "Méthode non autorisée" }, 405);
}

/* ------------------------------------------------------------------ */
/* Accès aux données                                                   */
/* ------------------------------------------------------------------ */

async function readCollection(env: Env, collection: Collection) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM ${collection}`
  ).all<Record<string, unknown>>();

  // Les contacts d'une entreprise sont stockés en JSON (colonne TEXT).
  if (collection === "companies") {
    return results.map((row) => ({
      ...row,
      contacts: JSON.parse((row.contacts as string) || "[]"),
    }));
  }
  return results;
}

async function replaceCollection(
  env: Env,
  collection: Collection,
  items: unknown[]
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM ${collection}`),
  ];

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    statements.push(insertStatement(env, collection, item));
  }

  await env.DB.batch(statements);
}

function insertStatement(
  env: Env,
  collection: Collection,
  item: Record<string, unknown>
): D1PreparedStatement {
  switch (collection) {
    case "sessions":
      return env.DB.prepare(
        `INSERT INTO sessions (id, activity, startedAt, durationSec)
         VALUES (?, ?, ?, ?)`
      ).bind(item.id, item.activity, item.startedAt, item.durationSec);

    case "companies":
      return env.DB.prepare(
        `INSERT INTO companies (id, name, sector, status, notes, contacts, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        item.name,
        item.sector,
        item.status,
        item.notes,
        JSON.stringify(item.contacts ?? []),
        item.createdAt
      );

    case "notes":
      return env.DB.prepare(
        `INSERT INTO notes (id, category, title, contentHtml, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        item.category,
        item.title,
        item.contentHtml,
        item.createdAt,
        item.updatedAt
      );

    case "clients":
      return env.DB.prepare(
        `INSERT INTO clients (id, firstName, lastName, role, phone, email, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        item.id,
        item.firstName,
        item.lastName,
        item.role,
        item.phone,
        item.email,
        item.notes,
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
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        activity TEXT NOT NULL,
        startedAt INTEGER NOT NULL,
        durationSec INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
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
        category TEXT NOT NULL,
        title TEXT,
        contentHtml TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
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
  ]);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
