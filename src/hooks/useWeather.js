import { useState, useEffect, useCallback } from 'react'
import { fetchWeather } from '../utils/weatherUtils'

export function useWeather() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('位置情報が利用できません')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWeather()
      setWeather(data)
    } catch (err) {
      if (err.code === 1) setError('位置情報の取得が拒否されました')
      else setError('天気の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { weather, loading, error, reload: load }
}
