export const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// dateTimeStr（UTC含む）をローカル日付文字列に変換
export const toLocalDateStr = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const d = new Date(dateTimeStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const formatDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

export const formatShortDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric',
  })

export const formatMonthDay = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export const calcSleepHours = (bedtime, wakeTime) => {
  if (!bedtime || !wakeTime) return null
  const [bH, bM] = bedtime.split(':').map(Number)
  const [wH, wM] = wakeTime.split(':').map(Number)
  let bedMins = bH * 60 + bM
  let wakeMins = wH * 60 + wM
  if (wakeMins <= bedMins) wakeMins += 24 * 60  // cross-midnight
  return Math.round((wakeMins - bedMins) / 60 * 10) / 10
}

export const formatEventTime = (dateTimeStr) => {
  if (!dateTimeStr) return '終日'
  const d = new Date(dateTimeStr)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}
