# Nesis — Suivi de temps & CRM de démarchage

Application React + TypeScript : suivi de temps (SAV / Démarchage), CRM de
prospection et notes (SAV / Démarchage), adossée à une base **Cloudflare D1**.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** + composants **shadcn/ui** (Button, Card, Tabs, Input, Table, Dialog…)
- **Framer Motion** pour les animations (chrono, onglets, accordéons)
- **Cloudflare Worker + base D1 (SQLite)** via une interface `StorageAdapter`,
  avec **cache LocalStorage** (l'app reste utilisable hors-ligne)

## Démarrage (développement)

Deux serveurs, dans deux terminaux :

```bash
npm install

# Terminal 1 — backend Worker + base D1 locale (port 8787)
npm run dev:api

# Terminal 2 — front Vite (port 5173, proxifie /api vers le Worker)
npm run dev
```

L'application est servie sur http://127.0.0.1:5173

> Sans `npm run dev:api`, le front fonctionne quand même : il bascule
> automatiquement sur le cache LocalStorage (mode hors-ligne).

```bash
npm run build   # build de production
npm run lint    # vérification TypeScript
```

## Base de données Cloudflare D1

Le schéma (`worker/schema.sql`) est créé automatiquement par le Worker au
premier appel API. Les données transitent par `/api/{sessions|companies|notes}`.

### Mise en production

```bash
wrangler login                       # une seule fois
wrangler d1 create nesis-db          # copier l'id renvoyé dans wrangler.jsonc
npm run db:init:remote               # crée le schéma sur la base distante
npm run deploy                       # build Vite + déploiement du Worker
```

## Architecture

```
src/
├── components/
│   ├── ui/               # Primitives shadcn/ui
│   └── ConfirmDialog.tsx # Dialog de confirmation réutilisable
├── features/
│   ├── timer/            # Écran 1 : chrono, stats, historique hebdomadaire
│   │   ├── TimerScreen.tsx
│   │   ├── TimerCard.tsx
│   │   └── WeeklyHistory.tsx
│   ├── crm/              # Écran 2 : CRM entreprises & contacts
│   │   ├── CrmScreen.tsx
│   │   ├── CompanyCard.tsx
│   │   ├── CompanyFormDialog.tsx
│   │   ├── ContactCard.tsx
│   │   └── ContactFormDialog.tsx
│   └── notes/            # Écrans 3 & 4 : notes SAV / Démarchage (texte riche)
│       ├── NotesScreen.tsx
│       └── NoteCard.tsx
├── components/
│   └── RichTextEditor.tsx # Éditeur gras/souligné (sans dépendance)
├── hooks/
│   ├── useTimer.ts       # Chrono basé sur l'horloge système
│   ├── useSessions.ts    # Historique + regroupement par semaine
│   ├── useCompanies.ts   # CRUD entreprises/contacts
│   └── useNotes.ts       # CRUD notes par catégorie
├── services/
│   └── storage.ts        # StorageAdapter : D1 (via /api) + cache LocalStorage
├── types/
│   └── index.ts          # Modèle de données
└── App.tsx               # Coquille + navigation responsive (4 onglets)

worker/
├── index.ts             # Worker Cloudflare : API /api/* adossée à D1
└── schema.sql           # Schéma des tables (référence + init manuelle)
wrangler.jsonc           # Config Worker + binding D1 + assets SPA
```

## Couche de persistance

Toute la persistance passe par l'interface `StorageAdapter`
([src/services/storage.ts](src/services/storage.ts)). L'implémentation par
défaut (`HybridAdapter`) lit/écrit sur **Cloudflare D1** via l'API du Worker et
maintient un **cache LocalStorage** : lecture D1 en priorité, repli local si le
backend est indisponible ; écriture immédiate en cache puis synchro D1.

Pour changer de backend, il suffit d'écrire une nouvelle classe implémentant
`StorageAdapter` et de remplacer l'export `db`. Aucun composant ni hook n'a
besoin d'être modifié — l'interface est asynchrone.
