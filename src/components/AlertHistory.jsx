import { useState, useEffect } from 'react'
import { getAlerts, markAlertRead, markAllAlertsRead, getRecentRecords } from '../utils/storage'
import { ALERT_STYLE, ALERT_TYPE_LABEL } from '../utils/alertUtils'
import { formatShortDate, formatMonthDay } from '../utils/dateUtils'

export default function AlertHistory({ onRead }) {
  const [alerts, setAlerts] = useState([])
  const [records, setRecords] = useState([])
  const [tab, setTab] = useState('alerts')

  const load = () => {
    setAlerts(getAlerts())
    setRecords(getRecentRecords(30).reverse())
  }

  useEffect(() => { load() }, [])

  const handleRead = (id) => {
    markAlertRead(id)
    load()
    onRead?.()
  }

  const handleReadAll = () => {
    markAllAlertsRead()
    load()
    onRead?.()
  }

  const unread = alerts.filter(a => !a.read)

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold text-slate-800">アラート・履歴</h1>
        {unread.length > 0 && (
          <button onClick={handleReadAll} className="text-xs text-indigo-500 font-medium underline">
            すべて既読
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        {[
          { id: 'alerts', label: `アラート${unread.length > 0 ? ` (${unread.length})` : ''}` },
          { id: 'history', label: '記録履歴' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-slate-500 font-medium">アラートはありません</p>
              <p className="text-sm text-slate-400 mt-1">現在のところ注意が必要な傾向は検出されていません</p>
            </div>
          )}
          {alerts.map(alert => {
            const style = ALERT_STYLE[alert.severity] ?? ALERT_STYLE.medium
            return (
              <div key={alert.id}
                className={`rounded-2xl border p-4 ${style.bg} ${style.border} ${alert.read ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-lg shrink-0 mt-0.5">{style.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{alert.title}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}>
                          {ALERT_TYPE_LABEL[alert.type] ?? alert.type}
                        </span>
                        {!alert.read && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                            未読
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {alert.date} 検出 • {new Date(alert.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {!alert.read && (
                    <button onClick={() => handleRead(alert.id)}
                      className="shrink-0 text-xs text-slate-400 underline">
                      既読
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {records.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-slate-500 font-medium">記録がありません</p>
              <p className="text-sm text-slate-400 mt-1">「今日」タブから記録を始めましょう</p>
            </div>
          )}
          {records.map(r => (
            <RecordCard key={r.date} record={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecordCard({ record: r }) {
  const moodColor =
    !r.moodScore ? 'bg-slate-100 text-slate-400' :
    r.moodScore <= 3 ? 'bg-red-100 text-red-600' :
    r.moodScore <= 5 ? 'bg-orange-100 text-orange-600' :
    r.moodScore <= 7 ? 'bg-yellow-100 text-yellow-700' :
    'bg-emerald-100 text-emerald-700'

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-700 text-sm">{formatShortDate(r.date)}</p>
          {r.weather && <span className="text-xs text-slate-400">{r.weather} {r.temperature != null ? `${r.temperature}°C` : ''}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {r.moodScore ? (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${moodColor}`}>
              気分 {r.moodScore}
            </span>
          ) : null}
          {r.medication === true && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">服薬✓</span>}
          {r.medication === false && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-medium">未服薬</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
        {r.sleepHours != null && (
          <span className="text-xs text-slate-500">睡眠 <b>{r.sleepHours}h</b></span>
        )}
        {r.anxietyLevel ? (
          <span className="text-xs text-slate-500">不安 <b>{r.anxietyLevel}/5</b></span>
        ) : null}
        {r.activityLevel && (
          <span className="text-xs text-slate-500">活動量 <b>{r.activityLevel}</b></span>
        )}
      </div>
      {r.memo && (
        <p className="text-xs text-slate-500 mt-2 border-t border-slate-50 pt-2 line-clamp-2">{r.memo}</p>
      )}
    </div>
  )
}
