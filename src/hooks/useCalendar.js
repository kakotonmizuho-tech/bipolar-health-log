import { useState, useCallback, useRef } from 'react'
import { getSettings } from '../utils/storage'

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'
const DISCOVERY = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
const TOKEN_KEY = 'ghl_cal_token'

// トークンをlocalStorageに保存（有効期限付き）
function saveToken(resp) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    access_token: resp.access_token,
    expiry: Date.now() + resp.expires_in * 1000,
  }))
}

// 保存済みの有効なトークンを取得
function loadToken() {
  try {
    const d = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? '{}')
    if (d.access_token && d.expiry > Date.now() + 120000) return d.access_token
  } catch {}
  return null
}

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
      const { calendarId } = getSettings()
      const resp = await window.gapi.client.calendar.events.list({
        calendarId: calendarId || 'primary',
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

      // 保存済みトークンが有効ならそのまま使う（ログイン画面を出さない）
      const stored = loadToken()
      if (stored) {
        window.gapi.client.setToken({ access_token: stored })
        await fetchEvents()
        return
      }

      // トークンがない or 期限切れ → OAuth フロー
      await loadScript('https://accounts.google.com/gsi/client')
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp) => {
          if (resp.error) { setError('認証に失敗しました'); return }
          saveToken(resp)          // トークンを保存
          await fetchEvents()
        },
      })
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
