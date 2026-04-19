export const checkAlerts = (records) => {
  const alerts = []
  const dates = Object.keys(records).sort().reverse()
  if (dates.length < 1) return alerts

  // Volatility: check today vs yesterday
  if (dates.length >= 2) {
    const today = records[dates[0]]
    const yesterday = records[dates[1]]
    if (today?.moodScore && yesterday?.moodScore) {
      const delta = Math.abs(today.moodScore - yesterday.moodScore)
      if (delta >= 4) {
        alerts.push({
          type: 'volatility',
          severity: 'medium',
          date: dates[0],
          message: `気分スコアが前日から${delta}ポイント変動しています（乱高下の可能性）。`,
          title: '気分の急変動',
        })
      }
    }
  }

  // 3-day trends
  if (dates.length >= 3) {
    const recent3 = dates.slice(0, 3)
      .map(d => records[d])
      .filter(r => r?.moodScore != null)

    if (recent3.length === 3) {
      const scores = recent3.map(r => r.moodScore)

      if (scores.every(s => s >= 1 && s <= 3)) {
        alerts.push({
          type: 'depression',
          severity: 'high',
          date: dates[0],
          message: `気分スコアが3日連続で低い値（${scores.join('→')}）です。抑うつ傾向の可能性があります。主治医にご相談ください。`,
          title: '抑うつ傾向アラート',
        })
      }

      if (scores.every(s => s >= 8 && s <= 10)) {
        alerts.push({
          type: 'mania',
          severity: 'high',
          date: dates[0],
          message: `気分スコアが3日連続で高い値（${scores.join('→')}）です。躁傾向の可能性があります。主治医にご相談ください。`,
          title: '躁傾向アラート',
        })
      }
    }
  }

  return alerts
}

export const ALERT_STYLE = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '🚨',
    badge: 'bg-red-100 text-red-700',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '⚠️',
    badge: 'bg-amber-100 text-amber-700',
  },
}

export const ALERT_TYPE_LABEL = {
  depression: '抑うつ傾向',
  mania: '躁傾向',
  volatility: '気分変動',
}
