const WMO = {
  0:  { text: '快晴',         emoji: '☀️' },
  1:  { text: '晴れ',         emoji: '🌤️' },
  2:  { text: '一部曇り',     emoji: '⛅' },
  3:  { text: '曇り',         emoji: '☁️' },
  45: { text: '霧',           emoji: '🌫️' },
  48: { text: '霧氷',         emoji: '🌫️' },
  51: { text: '霧雨（弱）',   emoji: '🌦️' },
  53: { text: '霧雨',         emoji: '🌦️' },
  55: { text: '霧雨（強）',   emoji: '🌦️' },
  61: { text: '雨（弱）',     emoji: '🌧️' },
  63: { text: '雨',           emoji: '🌧️' },
  65: { text: '大雨',         emoji: '🌧️' },
  71: { text: '雪（弱）',     emoji: '❄️' },
  73: { text: '雪',           emoji: '🌨️' },
  75: { text: '大雪',         emoji: '🌨️' },
  77: { text: '霰',           emoji: '🌨️' },
  80: { text: 'にわか雨（弱）', emoji: '🌦️' },
  81: { text: 'にわか雨',     emoji: '🌦️' },
  82: { text: 'にわか雨（強）', emoji: '⛈️' },
  85: { text: 'にわか雪（弱）', emoji: '🌨️' },
  86: { text: 'にわか雪',     emoji: '🌨️' },
  95: { text: '雷雨',         emoji: '⛈️' },
  96: { text: '雷雨（霰あり）', emoji: '⛈️' },
  99: { text: '激しい雷雨',   emoji: '⛈️' },
}

export const getWeatherInfo = (code) =>
  WMO[code] ?? { text: '不明', emoji: '🌡️' }

const getPosition = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 600000,
    })
  )

export const fetchWeather = async () => {
  const pos = await getPosition()
  const { latitude: lat, longitude: lon } = pos.coords
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather API error')
  const data = await res.json()
  const code = data.current.weather_code
  const { text, emoji } = getWeatherInfo(code)
  return {
    code,
    text,
    emoji,
    temperature: Math.round(data.current.temperature_2m),
  }
}
