// Lightweight cross-domain recommender.
// A "taste" is a weighted map of theme tags built from the items a person
// has saved. Everything else — match %, recommendations, "crossings" — is
// derived from the overlap between an item's tags and that taste.

// A gentle default so brand-new users still see meaningful numbers.
export const DEFAULT_TASTE = {
  memory: 3, place: 3, longing: 2, stillness: 2, light: 2, wonder: 1,
}

export function buildTaste(likedItems) {
  const v = {}
  likedItems.forEach((it) => {
    ;(it.tags || []).forEach((t) => {
      v[t] = (v[t] || 0) + 1
    })
  })
  return Object.keys(v).length ? v : { ...DEFAULT_TASTE }
}

export function topTags(taste, n = 10) {
  return Object.entries(taste)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, weight]) => ({ tag, weight }))
}

// 0..99 affinity between an item and a taste vector.
export function matchScore(item, taste) {
  const tags = item.tags || []
  if (!tags.length) return 0
  const max = Math.max(1, ...Object.values(taste))
  const overlap = tags.filter((t) => taste[t]).length
  const weighted = tags.reduce((s, t) => s + (taste[t] || 0) / max, 0)
  const coverage = overlap / tags.length // 0..1
  const intensity = weighted / tags.length // 0..1
  const pct = 55 + coverage * 30 + intensity * 14
  return Math.max(0, Math.min(99, Math.round(pct)))
}

export function withScores(items, taste) {
  return items.map((it) => ({ ...it, score: matchScore(it, taste) }))
}

// Ranked recommendations, optionally filtered by domain type(s).
export function recommend(catalog, taste, { types, excludeIds = [], limit = 24 } = {}) {
  const exclude = new Set(excludeIds)
  let pool = catalog.filter((it) => !exclude.has(it.id))
  if (types && types.length) pool = pool.filter((it) => types.includes(it.type))
  return withScores(pool, taste)
    .sort((a, b) => b.score - a.score || (a.title > b.title ? 1 : -1))
    .slice(0, limit)
}

// "Crossings" — threads that run across the whole library. For each of the
// strongest taste tags, gather items from multiple domains that share it.
export function crossings(catalog, taste, { excludeIds = [], perThread = 4, threads = 3 } = {}) {
  const exclude = new Set(excludeIds)
  const tags = topTags(taste, threads + 2).map((t) => t.tag)
  const out = []
  for (const tag of tags) {
    const items = withScores(
      catalog.filter((it) => !exclude.has(it.id) && (it.tags || []).includes(tag)),
      taste,
    ).sort((a, b) => b.score - a.score)
    const domains = new Set(items.slice(0, perThread).map((i) => i.type))
    if (items.length >= perThread && domains.size >= 2) {
      out.push({ tag, items: items.slice(0, perThread) })
    }
    if (out.length >= threads) break
  }
  return out
}

// One headline pick — the single highest-affinity item, excluding saved ones.
export function topPick(catalog, taste, { excludeIds = [] } = {}) {
  return recommend(catalog, taste, { excludeIds, limit: 1 })[0] || null
}
