// Merged catalog across all four domains, plus shared metadata.
import booksData from './books.json'
import songsData from './songs.json'
import essaysData from './essays.json'
import filmsData from './films.json'

// Theme vocabulary that powers taste, crossings and browse filters.
export const TAGS = [
  'the sea', 'memory', 'stillness', 'solitude', 'craft', 'light',
  'maps', 'patience', 'wonder', 'place', 'longing', 'time',
]

export const DOMAINS = {
  film: { key: 'film', label: 'Films', accentVar: '--films', letter: 'F' },
  song: { key: 'song', label: 'Songs', accentVar: '--songs', letter: 'S' },
  book: { key: 'book', label: 'Books', accentVar: '--books', letter: 'B' },
  essay: { key: 'essay', label: 'Articles', accentVar: '--essays', letter: 'A' },
}

export const DOMAIN_ORDER = ['film', 'song', 'book', 'essay']

// Base catalog — the offline-safe fallback. The server's /api/catalog is the
// source of truth (seeded from these JSONs, films refreshed from TMDB there).
export const baseCatalog = [
  ...filmsData,
  ...songsData,
  ...booksData,
  ...essaysData,
]

export function accentFor(type) {
  return `var(${DOMAINS[type]?.accentVar || '--accent'})`
}
