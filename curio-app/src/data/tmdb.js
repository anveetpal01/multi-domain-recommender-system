// Live film data from TMDB. Falls back silently to the bundled films.json
// (handled by the caller) if the network or API is unavailable.
const API_KEY = 'c2ddae4da825098d489b772dd70a49f8'
const IMG = 'https://image.tmdb.org/t/p/w500'

// Map TMDB genres onto Curio's theme vocabulary so films join "crossings".
const GENRE_TAGS = {
  18: 'memory', 10749: 'longing', 36: 'time', 99: 'place', 12: 'maps',
  14: 'wonder', 878: 'wonder', 16: 'wonder', 9648: 'stillness', 35: 'light',
  80: 'place', 27: 'solitude', 10752: 'time', 37: 'place', 10402: 'longing',
  53: 'patience', 28: 'light', 10751: 'memory',
}

const PAD_TAGS = ['memory', 'place', 'longing', 'light', 'time', 'wonder', 'stillness', 'craft']

function hashInt(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function normalize(m) {
  const tags = []
  ;(m.genre_ids || []).forEach((g) => {
    const t = GENRE_TAGS[g]
    if (t && !tags.includes(t)) tags.push(t)
  })
  // Guarantee at least two stable tags so every film can match.
  let i = hashInt(m.title || String(m.id))
  while (tags.length < 3) {
    const t = PAD_TAGS[i % PAD_TAGS.length]
    if (!tags.includes(t)) tags.push(t)
    i++
  }
  const year = (m.release_date || '').slice(0, 4)
  return {
    id: `film-tmdb-${m.id}`,
    type: 'film',
    title: m.title || m.original_title || 'Untitled',
    creator: '',
    cover: m.poster_path ? `${IMG}${m.poster_path}` : null,
    year: year ? Number(year) : null,
    meta: `Film${year ? ` · ${year}` : ''}`,
    description: (m.overview || '').slice(0, 180),
    tags: tags.slice(0, 3),
  }
}

export async function fetchFilms({ pages = 3 } = {}) {
  const collected = []
  for (let page = 1; page <= pages; page++) {
    const url =
      `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}` +
      `&sort_by=popularity.desc&vote_count.gte=300&page=${page}&language=en-US`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`TMDB ${res.status}`)
    const data = await res.json()
    ;(data.results || []).forEach((m) => {
      if (m.poster_path) collected.push(normalize(m))
    })
  }
  return collected
}
