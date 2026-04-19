import { useState, useCallback, useRef } from 'react'
import { getSettings } from '../utils/storage'

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'
const DISCOVERY = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export function useCalendar() {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const tokenClientRef = useRef(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const dayAfterTomorrow = new Date(today); dayAfterTomorrow.setDate(today.getDate() + 2)
      const resp = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: today.toISOString(),
        timeMax: dayAfterTomorrow.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 20,
      })
      setEvents(resp.result.items ?? [])
      setConnected(true)
    } catch {
      setError('予定の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  const initialize = useCallback(async () => {
    const settings = getSettings()
    const apiKey = settings.googleApiKey || import.meta.env.VITE_GOOGLE_API_KEY
    const clientId = settings.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID

    if (!apiKey || !clientId) {
      setError('no-config')
      return
    }

    try {
      await loadScript('https://apis.google.com/js/api.js')
      await new Promise(r => window.gapi.load('client', r))
      await window.gapi.client.init({ apiKey, discoveryDocs: [DISCOVERY] })

      await loadScript('https://accounts.google.com/gsi/client')
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp) => {
          if (resp.error) { setError('認証に失敗しました'); return }
          await fetchEvents()
        },
      })
      // Try silent token request first
      tokenClientRef.current.requestAccessToken({ prompt: '' })
    } catch {
      setError('Google APIの初期化に失敗しました')
    }
  }, [fetchEvents])

  const connect = useCallback(() => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    } else {
      initialize()
    }
  }, [initialize])

  return { events, connected, loading, error, initialize, connect }
}
