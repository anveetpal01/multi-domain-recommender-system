# Curio — a library that learns you

A React rebuild of the multi-domain recommender, using your Figma "Curio" UI.
One calm, editorial home for **Films · Songs · Books · Essays**, where everything
is recommended as a single taste — with a cross-domain recommender, three themes,
and your real data wired in.

---

## See it in 10 seconds (no install)

Open **`curio-app/dist/index.html`** in any browser (double-click it).

- Works offline — covers fall back to coloured letter tiles.
- With internet it also loads live film posters (TMDB), real book/song cover art,
  and the Spectral / Hanken Grotesk / JetBrains Mono fonts.

## Run it properly (dev mode)

Requires **Node.js 18+**.

```bash
cd curio-app
npm install
npm run dev        # opens http://localhost:5173
```

Other commands: `npm run build` (production build into `dist/`), `npm run preview`
(serve the build).

---

## What's inside

**Stack:** React 18 + Vite + React Router. Styling is plain CSS with CSS custom
properties (CSS Modules per component) — exactly the "swap the palette, the whole
app re-skins" idea from your design-tokens screen.

**Three themes** (top-right swatches): **Paper** (light), **Ink** (dark),
**Mist** (cool). Your choice is remembered.

**The 8 screens** (each is responsive — desktop sidebar + mobile bottom tab bar):

| Screen | Route | Figma page |
| --- | --- | --- |
| Login / create library | `/login` | login |
| Onboarding — pick a few you love | `/onboarding` | page2 |
| Home — today's pick + crossings | `/` | page3 |
| Browse by domain (filters + sort) | `/browse/:domain` | page4 |
| Item detail — match % + threads | `/item/:id` | page5 |
| Search & discovery | `/search` | page6 |
| Library (saved, grouped) | `/library` | page7 |
| Taste profile + settings | `/taste` | page8 |

Mobile pages 9–11 from Figma were the design-token reference and the Ink/Mist
theme demos — those are implemented as the live theme system rather than separate
screens.

## Real data wired in

| Domain | Source |
| --- | --- |
| **Films** | Live **TMDB** API (your existing key) + a curated offline fallback |
| **Songs** | Your `FRONTEND/DATABASE/MUSIC-POSTER.xlsx` → 150 tracks |
| **Books** | Your `FRONTEND/DATABASE/rec-sys-books.json` → 149 books |
| **Essays** | A curated set of 36 (your old project had no essays data) |

> Note: the new design uses **Essays** instead of the old Courses/Colleges, so
> those two domains were replaced to match the UI.

## How the recommender works

Every item carries a few **theme tags** (the sea, memory, stillness, solitude,
craft, light, maps, patience, wonder, place, longing, time). When you save things,
Curio builds a **taste vector** from their tags, then:

- **Match %** = how strongly an item's tags overlap your taste.
- **Crossings** = threads (e.g. "the sea") that run across *different* domains.
- **Today's pick / attuned rows** = top matches you haven't saved yet.

Your library, taste, theme and settings persist in the browser (localStorage).

## Project structure

```
curio-app/
  src/
    data/        books/songs/essays/films JSON, catalog, TMDB module
    shared/      contexts (theme, catalog, library), recommender, UI, ItemCard
    app/         AppLayout (sidebar + mobile tab bar)
    screens/     Login, Onboarding, Home, Browse, Detail, Search, Library, Taste
    styles/      tokens.css (3 themes), global.css
```
