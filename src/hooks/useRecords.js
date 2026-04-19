import { useState, useCallback, useEffect } from 'react'
import { getRecords, getRecord, saveRecord, getRecentRecords, getAlerts, addAlert } from '../utils/storage'
import { checkAlerts } from '../utils/alertUtils'

export function useRecords(days = 30) {
  const [records, setRecords] = useState({})
  const [recentRecords, setRecentRecords] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    const all = getRecords()
    setRecords(all)
    setRecentRecords(getRecentRecords(days))

    // Detect and persist new alerts (skip duplicates for today)
    const today = new Date().toISOString().split('T')[0]
    const existing = getAlerts()
    const newAlerts = checkAlerts(all)
    newAlerts.forEach(alert => {
      const dup = existing.some(a => a.type === alert.type && a.date === today)
      if (!dup) addAlert(alert)
    })

    setUnreadCount(getAlerts().filter(a => !a.read).length)
  }, [days])

  useEffect(() => { refresh() }, [refresh])

  const save = useCallback((date, data) => {
    saveRecord(date, data)
    refresh()
  }, [refresh])

  const get = useCallback((date) => getRecord(date), [])

  return { records, recentRecords, unreadCount, save, get, refresh }
}
