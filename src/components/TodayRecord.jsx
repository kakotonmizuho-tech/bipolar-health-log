import { useState, useEffect, useCallback } from 'react'
import { useWeather } from '../hooks/useWeather'
import { useCalendar } from '../hooks/useCalendar'
import { getRecord, getSettings } from '../utils/storage'
import { calcSleepHours, getTodayStr, formatEventTime, toLocalDateStr } from '../utils/dateUtils'

// ── デフォルト顔文字（設定で上書き可能） ─────────────────────────
const DEFAULT_MOOD_EMOJI  = ['', '😭', '😢', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩']
const MOOD_LABEL  = ['', 'とても辛い', '辛い', '落ち込む', 'やや落ち込む', '普通', '少し良い', '良い', 'とても良い', '元気！', '最高！']
const MOOD_BG     = ['',
  'bg-red-100 border-red-300',    'bg-red-100 border-red-300',
  'bg-orange-100 border-orange-300', 'bg-amber-100 border-amber-300',
  'bg-slate-100 border-slate-300',   'bg-lime-100 border-lime-300',
  'bg-green-100 border-green-300',   'bg-emerald-100 border-emerald-300',
  'bg-teal-100 border-teal-300',     'bg-cyan-100 border-cyan-300',
]
const ANXIETY_EMOJI  = ['', '😌', '🙂', '😐', '😟', '😰']
const ANXIETY_LABEL  = ['', '全く不安なし', '少し落ち着かない', '普通', 'やや不安', 'とても不安']
const ANXIETY_BG     = ['',
  'bg-emerald-100 border-emerald-300', 'bg-lime-100 border-lime-300',
  'bg-slate-100 border-slate-300',     'bg-amber-100 border-amber-300',
  'bg-red-100 border-red-300',
]
const SLEEP_SAT_EMOJI = ['', '😩', '😔', '😐', '🙂', '😴']
const SLEEP_SAT_LABEL = ['', 'とても悪い', '悪い', '普通', '良い', 'とてもよく眠れた']
const SLEEP_SAT_BG    = ['',
  'bg-red-100 border-red-300',   'bg-amber-100 border-amber-300',
  'bg-slate-100 border-slate-300', 'bg-lime-100 border-lime-300',
  'bg-emerald-100 border-emerald-300',
]
const ACTIVITY = ['低', '中', '高']

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function TodayRecord({ onSave }) {
  const todayStr = getTodayStr()
  const [dateStr, setDateStr] = useState(todayStr)

  const { weather, loading: wLoading, error: wError, reload: wReload } = useWeather()
  const { events, connected, loading: cLoading, error: cError, initialize, connect } = useCalendar()

  const [form, setForm] = useState({
    bedtime: '', wakeTime: '',
    sleepSatisfaction: 0, moodScore: 0, anxietyLevel: 0,
    activityLevel: '中', medication: null, memo: '',
  })

  // マイ薬リスト（設定から）
  const [myMeds, setMyMeds]     = useState([])
  const [takenMeds, setTakenMeds] = useState([])   // 今日服薬した薬（id, name, dose, unit, taken）

  // その他の薬（一時追加）
  const [otherMeds, setOtherMeds]   = useState([])
  const [newMed, setNewMed]         = useState({ name: '', dose: '', time: '' })
  const [showMedForm, setShowMedForm] = useState(false)

  // カスタム顔文字
  const [moodEmoji, setMoodEmoji] = useState([...DEFAULT_MOOD_EMOJI])

  const [saved, setSaved] = useState(false)

  // 設定・記録を読み込む
  useEffect(() => {
    const s = getSettings()

    // カスタム顔文字を反映
    if (s.moodEmoji) {
      const arr = [...DEFAULT_MOOD_EMOJI]
      Object.entries(s.moodEmoji).forEach(([k, v]) => { arr[Number(k)] = v })
      setMoodEmoji(arr)
    }

    // マイ薬リスト
    setMyMeds(s.myMeds ?? [])
  }, [])

  useEffect(() => {
    const s = getSettings()
    const existing = getRecord(dateStr)

    setForm({
      bedtime:          existing?.bedtime          ?? '',
      wakeTime:         existing?.wakeTime         ?? '',
      sleepSatisfaction: existing?.sleepSatisfaction ?? 0,
      moodScore:        existing?.moodScore        ?? 0,
      anxietyLevel:     existing?.anxietyLevel     ?? 0,
      activityLevel:    existing?.activityLevel    ?? '中',
      medication:       existing?.medication       ?? null,
      memo:             existing?.memo             ?? '',
    })
    setOtherMeds(existing?.otherMeds ?? [])

    // マイ薬リストと保存済みの服薬状態をマージ
    const saved = existing?.takenMeds ?? []
    const merged = (s.myMeds ?? []).map(m => {
      const hit = saved.find(t => t.id === m.id)
      return hit ?? { id: m.id, name: m.name, dose: m.defaultDose, unit: m.unit, taken: false }
    })
    setTakenMeds(merged)
    setSaved(false)
  }, [dateStr])

  useEffect(() => { initialize() }, [])

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])
  const sleepHours = calcSleepHours(form.bedtime, form.wakeTime)
  const isToday    = dateStr === todayStr

  // マイ薬の服薬トグル / 用量変更
  const toggleTaken  = (id) => setTakenMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m))
  const changeDose   = (id, dose) => setTakenMeds(prev => prev.map(m => m.id === id ? { ...m, dose } : m))

  // その他の薬
  const addOtherMed = (name) => {
    const n = name ?? newMed.name.trim()
    if (!n) return
    setOtherMeds(prev => [...prev, { id: Date.now(), name: n, dose: newMed.dose, time: newMed.time }])
    setNewMed({ name: '', dose: '', time: '' })
    setShowMedForm(false)
  }
  const removeOtherMed = (id) => setOtherMeds(prev => prev.filter(m => m.id !== id))

  const handleSave = () => {
    const rec = getRecord(dateStr)
    onSave(dateStr, {
      ...form,
      sleepHours,
      takenMeds,
      otherMeds,
      weather:       isToday ? (weather?.text          ?? '') : (rec?.weather       ?? ''),
      weatherCode:   isToday ? (weather?.code          ?? null) : (rec?.weatherCode ?? null),
      temperature:   isToday ? (weather?.temperature   ?? null) : (rec?.temperature ?? null),
      feelsLike:     isToday ? (weather?.feelsLike      ?? null) : (rec?.feelsLike   ?? null),
      humidity:      isToday ? (weather?.humidity       ?? null) : (rec?.humidity    ?? null),
      precipitation: isToday ? (weather?.precipitation  ?? null) : (rec?.precipitation ?? null),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // カレンダー
  const tomorrowStr    = addDays(dateStr, 1)
  const matchDate      = (e, t) => e.start?.date ? e.start.date === t : toLocalDateStr(e.start?.dateTime ?? '') === t
  const todayEvents    = events.filter(e => matchDate(e, dateStr))
  const tomorrowEvents = events.filter(e => matchDate(e, tomorrowStr))
  const showCalendar   = isToday && cError !== 'no-config'

  return (
    <div className="p-4 space-y-3">

      {/* ── 日付ナビゲーション ── */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setDateStr(addDays(dateStr, -1))}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 active:bg-slate-100 text-lg">
          ‹
        </button>
        <div className="flex-1 mx-2 text-center">
          <p className="text-xs font-semibold mb-0.5 text-indigo-500">
            {isToday ? '今日' : dateStr > todayStr ? '未来' : '過去の記録'}
          </p>
          <input type="date" value={dateStr} max={todayStr}
            onChange={e => e.target.value && setDateStr(e.target.value)}
            className="text-base font-bold text-slate-800 text-center bg-transparent border-none focus:outline-none cursor-pointer w-full" />
        </div>
        <button onClick={() => !isToday && setDateStr(addDays(dateStr, 1))} disabled={isToday}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 active:bg-slate-100 disabled:opacity-30 text-lg">
          ›
        </button>
      </div>

      {/* ── 天気（今日のみ・湿度・体感温度も表示） ── */}
      {isToday && (
        <div className="flex justify-end">
          <WeatherBadge weather={weather} loading={wLoading} error={wError} onReload={wReload} />
        </div>
      )}

      {/* ── カレンダー（今日のみ） ── */}
      {showCalendar && (
        <div className="card">
          <p className="section-title mb-2">今日・明日の予定</p>
          {!connected && !cLoading && (
            <button onClick={connect} className="text-sm text-indigo-500 underline">
              Googleカレンダーを接続して予定を表示
            </button>
          )}
          {cLoading && <p className="text-xs text-slate-400">読み込み中...</p>}
          {connected && todayEvents.length === 0 && tomorrowEvents.length === 0 && (
            <p className="text-xs text-slate-400">予定はありません</p>
          )}
          {todayEvents.map(e => <EventItem key={e.id} event={e} label="今日" />)}
          {tomorrowEvents.map(e => <EventItem key={e.id} event={e} label="明日" />)}
        </div>
      )}

      {/* ── 睡眠 ── */}
      <div className="card space-y-3">
        <p className="section-title">睡眠</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">就寝時間</label>
            <input type="time" value={form.bedtime} onChange={e => set('bedtime', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">起床時間</label>
            <input type="time" value={form.wakeTime} onChange={e => set('wakeTime', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
        {sleepHours !== null && (
          <div className="bg-indigo-50 rounded-xl px-4 py-2 text-center">
            <span className="text-2xl font-bold text-indigo-600">{sleepHours.toFixed(1)}</span>
            <span className="text-sm text-indigo-400 ml-1">時間の睡眠</span>
          </div>
        )}
        <div>
          <label className="text-xs text-slate-500 block mb-2">睡眠満足度</label>
          <EmojiButtons value={form.sleepSatisfaction} count={5}
            emojis={SLEEP_SAT_EMOJI} labels={SLEEP_SAT_LABEL} bgs={SLEEP_SAT_BG}
            onChange={v => set('sleepSatisfaction', v)} />
        </div>
      </div>

      {/* ── 気分スコア（カスタム顔文字対応） ── */}
      <div className="card space-y-3">
        <p className="section-title">気分スコア（1–10）</p>
        {form.moodScore > 0 && (
          <div className="text-center py-1">
            <span className="text-4xl">{moodEmoji[form.moodScore]}</span>
            <p className="text-sm text-slate-500 mt-1">{MOOD_LABEL[form.moodScore]}</p>
          </div>
        )}
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => set('moodScore', n)}
              className={`flex flex-col items-center py-2 rounded-xl border-2 transition-all active:scale-95 ${
                form.moodScore === n ? MOOD_BG[n] + ' shadow-sm scale-105' : 'bg-slate-50 border-slate-100'
              }`}>
              <span className="text-xl leading-none">{moodEmoji[n]}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 px-1">
          <span>{moodEmoji[1]} とても辛い</span>
          <span>とても良い {moodEmoji[10]}</span>
        </div>
      </div>

      {/* ── 不安レベル ── */}
      <div className="card space-y-2">
        <p className="section-title">不安レベル（1–5）</p>
        {form.anxietyLevel > 0 && (
          <p className="text-xs text-center text-slate-500">{ANXIETY_LABEL[form.anxietyLevel]}</p>
        )}
        <EmojiButtons value={form.anxietyLevel} count={5}
          emojis={ANXIETY_EMOJI} labels={ANXIETY_LABEL} bgs={ANXIETY_BG}
          onChange={v => set('anxietyLevel', v)} />
      </div>

      {/* ── 活動量 ── */}
      <div className="card">
        <p className="section-title mb-2">活動量</p>
        <div className="flex gap-2">
          {ACTIVITY.map((opt, i) => (
            <button key={opt} onClick={() => set('activityLevel', opt)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-0.5 ${
                form.activityLevel === opt ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}>
              <span>{['🐢', '🚶', '🏃'][i]}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 精神科の服薬 ── */}
      <div className="card space-y-2">
        <p className="section-title">精神科の服薬</p>
        <div className="flex gap-2">
          <button onClick={() => set('medication', true)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              form.medication === true ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>✓ 服薬済み</button>
          <button onClick={() => set('medication', false)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              form.medication === false ? 'bg-red-400 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>✗ 未服薬</button>
        </div>

        {/* マイ薬リスト */}
        {takenMeds.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] text-slate-400 font-medium">マイ薬リスト</p>
            {takenMeds.map(m => (
              <div key={m.id}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all ${
                  m.taken ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                {/* 服薬チェック */}
                <button onClick={() => toggleTaken(m.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    m.taken ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                  }`}>
                  {m.taken && <span className="text-xs">✓</span>}
                </button>
                <span className="text-sm font-medium text-slate-700 flex-1">{m.name}</span>
                {/* 用量入力 */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number" min="0" step="0.5"
                    value={m.dose}
                    onChange={e => changeDose(m.id, e.target.value)}
                    className="w-12 text-center text-sm border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                  <span className="text-xs text-slate-400">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {takenMeds.length === 0 && (
          <p className="text-xs text-slate-400 text-center pt-1">
            設定画面でマイ薬リストを登録すると、ここに表示されます
          </p>
        )}
      </div>

      {/* ── その他の薬・市販薬 ── */}
      <div className="card space-y-2">
        <p className="section-title">その他の薬・市販薬</p>
        {otherMeds.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span>💊</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{m.name}</p>
                {(m.dose || m.time) && (
                  <p className="text-xs text-slate-400">{[m.dose, m.time].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </div>
            <button onClick={() => removeOtherMed(m.id)} className="text-slate-300 hover:text-red-400 text-xl ml-2">×</button>
          </div>
        ))}
        {!showMedForm && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {['頭痛薬', '解熱剤', '胃薬', '鎮痛剤', '整腸剤', '抗ヒスタミン薬', 'ビタミン剤', '漢方薬'].map(name => (
              <button key={name} onClick={() => addOtherMed(name)}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-full hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                + {name}
              </button>
            ))}
            <button onClick={() => setShowMedForm(true)}
              className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 px-2.5 py-1.5 rounded-full">
              + カスタム入力
            </button>
          </div>
        )}
        {showMedForm && (
          <div className="border border-indigo-100 rounded-xl p-3 space-y-2 bg-indigo-50">
            <input value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))}
              placeholder="薬の名前" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <input value={newMed.dose} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))}
                placeholder="用量（例：1錠）" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
              <input type="time" value={newMed.time} onChange={e => setNewMed(m => ({ ...m, time: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowMedForm(false); setNewMed({ name: '', dose: '', time: '' }) }}
                className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm">キャンセル</button>
              <button onClick={() => addOtherMed()} disabled={!newMed.name.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold disabled:opacity-40">追加</button>
            </div>
          </div>
        )}
      </div>

      {/* ── メモ ── */}
      <div className="card">
        <p className="section-title mb-2">メモ</p>
        <textarea value={form.memo} onChange={e => set('memo', e.target.value)}
          placeholder="今日の気づき・出来事・体調の変化など..."
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
      </div>

      {/* ── 保存ボタン ── */}
      <button onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white'
        }`}>
        {saved ? '✓ 保存しました！' : (isToday ? '今日の記録を保存' : `${dateStr} の記録を保存`)}
      </button>
    </div>
  )
}

// ── サブコンポーネント ────────────────────────────────────────────

function EmojiButtons({ value, count, emojis, labels, bgs, onChange }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onChange(n)}
          className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
            value === n ? bgs[n] + ' shadow-sm scale-105' : 'bg-slate-50 border-slate-100'
          }`}>
          <span className="text-2xl leading-none">{emojis[n]}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{n}</span>
        </button>
      ))}
    </div>
  )
}

function WeatherBadge({ weather, loading, error, onReload }) {
  if (loading) return <p className="text-xs text-slate-400">天気取得中...</p>
  if (error)   return <button onClick={onReload} className="text-xs text-amber-500 underline">再取得</button>
  if (!weather) return null
  return (
    <button onClick={onReload} className="text-right active:opacity-70 space-y-0.5">
      <p className="text-3xl leading-none">{weather.emoji}</p>
      <p className="text-xs font-medium text-slate-600">{weather.text} {weather.temperature}°C</p>
      <p className="text-[10px] text-slate-400">体感 {weather.feelsLike}°C・湿度 {weather.humidity}%</p>
    </button>
  )
}

function EventItem({ event, label }) {
  const time = event.start?.dateTime ? formatEventTime(event.start.dateTime) : '終日'
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm border-b border-slate-50 last:border-0">
      <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
        label === '今日' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
      }`}>{label}</span>
      <div className="min-w-0">
        <p className="font-medium text-slate-700 truncate">{event.summary ?? '(無題)'}</p>
        <p className="text-xs text-slate-400">{time}</p>
      </div>
    </div>
  )
}
