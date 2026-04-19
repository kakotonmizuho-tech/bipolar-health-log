import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, LineChart, BarChart,
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Area, AreaChart,
} from 'recharts'
import { getRecentRecords } from '../utils/storage'
import { formatMonthDay } from '../utils/dateUtils'

const RANGES = [
  { label: '2週間', days: 14 },
  { label: '1ヶ月', days: 30 },
]

export default function TrendGraph() {
  const [range, setRange] = useState(14)

  const data = useMemo(() => {
    const records = getRecentRecords(range)
    return records.map(r => ({
      date: formatMonthDay(r.date),
      mood: r.moodScore || null,
      anxiety: r.anxietyLevel || null,
      sleep: r.sleepHours || null,
      sleepSat: r.sleepSatisfaction || null,
      medication: r.medication === true ? 1 : r.medication === false ? 0 : null,
    }))
  }, [range])

  const stats = useMemo(() => {
    const withMood = data.filter(d => d.mood != null)
    const withSleep = data.filter(d => d.sleep != null)
    const withMed = data.filter(d => d.medication != null)
    return {
      avgMood: withMood.length ? (withMood.reduce((s, d) => s + d.mood, 0) / withMood.length).toFixed(1) : '—',
      avgSleep: withSleep.length ? (withSleep.reduce((s, d) => s + d.sleep, 0) / withSleep.length).toFixed(1) : '—',
      medRate: withMed.length ? Math.round(withMed.filter(d => d.medication === 1).length / withMed.length * 100) : '—',
      recorded: withMood.length,
    }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-4xl mb-4">📊</p>
        <p className="text-slate-500 font-medium">記録がありません</p>
        <p className="text-sm text-slate-400 mt-1">「今日」タブから記録を始めましょう</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold text-slate-800">トレンド</h1>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                range === r.days ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="平均気分" value={stats.avgMood} unit="/10" color="text-indigo-600" />
        <StatCard label="平均睡眠" value={stats.avgSleep} unit="h" color="text-blue-600" />
        <StatCard label="服薬率" value={stats.medRate === '—' ? '—' : `${stats.medRate}`} unit={stats.medRate === '—' ? '' : '%'} color="text-emerald-600" />
      </div>

      {/* Mood chart */}
      <div className="card">
        <p className="section-title mb-3">気分スコア（1–10）</p>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[0,3,5,7,10]} />
            <Tooltip content={<CustomTooltip unit="" />} />
            <ReferenceLine y={3} stroke="#fca5a5" strokeDasharray="4 3" strokeWidth={1.5} />
            <ReferenceLine y={8} stroke="#fca5a5" strokeDasharray="4 3" strokeWidth={1.5} />
            <Area type="monotone" dataKey="mood" fill="#e0e7ff" stroke="#6366f1"
              strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
          <span className="text-red-400">── 警戒ライン（3/8）</span>
        </div>
      </div>

      {/* Sleep chart */}
      <div className="card">
        <p className="section-title mb-3">睡眠時間（時間）</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
            <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip content={<CustomTooltip unit="h" />} />
            <ReferenceLine y={7} stroke="#93c5fd" strokeDasharray="4 3" strokeWidth={1.5} />
            <Bar dataKey="sleep" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-blue-400 mt-1 px-1">── 推奨7時間ライン</p>
      </div>

      {/* Anxiety chart */}
      <div className="card">
        <p className="section-title mb-3">不安レベル（1–5）</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
            <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[0,1,2,3,4,5]} />
            <Tooltip content={<CustomTooltip unit="" />} />
            <Area type="monotone" dataKey="anxiety" fill="#fef3c7" stroke="#f59e0b"
              strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Medication dots */}
      <div className="card">
        <p className="section-title mb-3">服薬記録</p>
        <div className="flex flex-wrap gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                d.medication === 1 ? 'bg-emerald-100 text-emerald-600' :
                d.medication === 0 ? 'bg-red-100 text-red-500' :
                'bg-slate-100 text-slate-300'
              }`}>
                {d.medication === 1 ? '✓' : d.medication === 0 ? '✗' : '—'}
              </div>
              <span className="text-[9px] text-slate-400">{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="card text-center py-3">
      <p className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${color}`}>
        {value}<span className="text-xs font-normal ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length || payload[0].value == null) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="text-slate-500 mb-0.5">{label}</p>
      <p className="font-bold text-slate-800">{payload[0].value}{unit}</p>
    </div>
  )
}
