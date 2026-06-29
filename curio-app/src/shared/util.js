export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const coverLetter = (item) =>
  (item?.title || '?').trim().charAt(0).toUpperCase() || '?'

export const greeting = (d = new Date()) => {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export const longDate = (d = new Date()) =>
  d
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase()
