const RECORDS_KEY = 'bhl_records'
const SETTINGS_KEY = 'bhl_settings'
const ALERTS_KEY = 'bhl_alerts'

const parse = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

// Records
export const getRecords = () => parse(RECORDS_KEY, {})

export const getRecord = (date) => getRecords()[date] ?? null

export const saveRecord = (date, data) => {
  const records = getRecords()
  records[date] = { ...records[date], ...data, date }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

export const getRecentRecords = (days = 30) => {
  const records = getRecords()
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (records[key]) result.push(records[key])
  }
  return result
}

export const exportRecords = () => {
  const data = {
    records: getRecords(),
    exportedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `health-log-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const clearAllData = () => {
  localStorage.removeItem(RECORDS_KEY)
  localStorage.removeItem(ALERTS_KEY)
}

// Settings
export const getSettings = () => parse(SETTINGS_KEY, {})

export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Alerts
export const getAlerts = () => parse(ALERTS_KEY, [])

export const saveAlerts = (alerts) => {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export const addAlert = (alert) => {
  const alerts = getAlerts()
  alerts.unshift({ ...alert, id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), read: false })
  saveAlerts(alerts.slice(0, 200))
}

export const markAlertRead = (id) => {
  const alerts = getAlerts()
  saveAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a))
}

export const markAllAlertsRead = () => {
  saveAlerts(getAlerts().map(a => ({ ...a, read: true })))
}
