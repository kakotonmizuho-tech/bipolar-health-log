import { useState, useEffect, useCallback } from 'react'
import { useWeather } from '../hooks/useWeather'
import { useCalendar } from '../hooks/useCalendar'
import { getRecord } from '../utils/storage'
import { formatDate, calcSleepHours, getTodayStr, formatEventTime } from '../utils/dateUtils'

// ── 顔文字マッピング ────────────────────────────────────────────
const MOOD_EMOJI = ['', '😭', '😢', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩']
const MOOD_LABEL = ['', 'とても辛い', '辛い', '落ち込む', 'やや落ち込む', '普通', '少し良い', '良い', 'とても良い', '元気！', '最高！']
const MOOD_BG = ['', 'bg-red-100 border-red-300', 'bg-red-100 border-red-300', 'bg-orange-100 border-orange-300',
  'bg-amber-100 border-amber-300', 'bg-slate-100 border-slate-300', 'bg-lime-100 border-lime-300',
  'bg-green-100 border-green-300', 'bg-emerald-100 border-emerald-300', 'bg-teal-100 border-teal-300', 'bg-cyan-100 border-cyan-300']

const ANXIETY_EMOJI  = ['', '😌', '🙂', '😐', '😟', '😰']
const ANXIETY_LABEL  = ['', '全く不安なし', '少し落ち着かない', '普通', 'やや不安', 'とても不安']
const ANXIETY_BG     = ['', 'bg-emerald-100 border-emerald-300', 'bg-lime-100 border-lime-300',
  'bg-slate-100 border-slate-300', 'bg-amber-100 border-amber-300', 'bg-red-100 border-red-300']

const SLEEP_SAT_EMOJI = ['', '😩', '😔', '😐', '🙂', '😴']
const SLEEP_SAT_LABEL = ['', 'とても悪い', '悪い', '普通', '良い', 'とてもよく眠れた']
const SLEEP_SAT_BG    = ['', 'bg-red-100 border-red-300', 'bg-amber-100 border-amber-300',
  'bg-slate-100 border-slate-300', 'bg-lime-100 border-lime-300', 'bg-emerald-100 border-emerald-300']

const ACTIVITY = ['低', '中', '高']

const PRESET_MEDS = ['頭痛薬', '解熱剤', '胃薬', '鎮痛剤', '整腸剤', '抗ヒスタミン薬', 'ビタミン剤', '漢方薬']

// ── 日付ユーティリティ ────────────────────────────────────────────
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
  const [otherMeds, setOtherMeds] = useState([])
  const [newMed, setNewMed] = useState({ name: '', dose: '', time: '' })
  const [showMedForm, setShowMedForm] = useState(false)
  const [saved, setSaved] = useState(false)

  // 日付変更時にその日の記録を読み込む
  useEffect(() => {
    const existing = getRecord(dateStr)
    setForm({
      bedtime: existing?.bedtime ?? '',
      wakeTime: existing?.wakeTime ?? '',
      sleepSatisfaction: existing?.sleepSatisfaction ?? 0,
      moodScore: existing?.moodScore ?? 0,
      anxietyLevel: existing?.anxietyLevel ?? 0,
      activityLevel: existing?.activityLevel ?? '中',
      medication: existing?.medication ?? null,
      memo: existing?.memo ?? '',
    })
    setOtherMeds(existing?.otherMeds ?? [])
    setSaved(false)
  }, [dateStr])

  useEffect(() => { initialize() }, [])

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])
  const sleepHours = calcSleepHours(form.bedtime, form.wakeTime)
  const isToday = dateStr === todayStr
  const isFuture = dateStr > todayStr

  // 他の薬を追加
  const addMed = (name) => {
    const n = name ?? newMed.name.trim()
    if (!n) return
    setOtherMeds(prev => [...prev, { id: Date.now(), name: n, dose: newMed.dose, time: newMed.time }])
    setNewMed({ name: '', dose: '', time: '' })
    setShowMedForm(false)
  }
  const removeMed = (id) => setOtherMeds(prev => prev.filter(m => m.id !== id))

  const handleSave = () => {
    onSave(dateStr, {
      ...form,
      sleepHours,
      otherMeds,
      weather: isToday ? (weather?.text ?? '') : (getRecord(dateStr)?.weather ?? ''),
      weatherCode: isToday ? (weather?.code ?? null) : (getRecord(dateStr)?.weatherCode ?? null),
      temperature: isToday ? (weather?.temperature ?? null) : (getRecord(dateStr)?.temperature ?? null),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // カレンダー：その日と翌日の予定
  const tomorrowStr = addDays(dateStr, 1)
  const todayEvents    = events.filter(e => (e.start?.dateTime ?? e.start?.date ?? '').startsWith(dateStr))
  const tomorrowEvents = events.filter(e => (e.start?.dateTime ?? e.start?.date ?? '').startsWith(tomorrowStr))
  const showCalendar = isToday && cError !== 'no-config'

  return (
    <div className="p-4 space-y-3">

      {/* ── 日付ナビゲーション ── */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setDateStr(addDays(dateStr, -1))}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 active:bg-slate-100">
          ‹
        </button>
        <div className="flex-1 mx-2 text-center">
          {isToday
            ? <p className="text-xs text-indigo-500 font-semibold mb-0.5">今日</p>
            : !isToday && <p className="text-xs text-slate-400 mb-0.5">{dateStr > todayStr ? '未来' : '過去の記録'}</p>
          }
          <input type="date" value={dateStr} max={todayStr}
            onChange={e => e.target.value && setDateStr(e.target.value)}
            className="text-base font-bold text-slate-800 text-center bg-transparent border-none focus:outline-none cursor-pointer w-full" />
        </div>
        <button onClick={() => !isToday && setDateStr(addDays(dateStr, 1))}
          disabled={isToday}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 active:bg-slate-100 disabled:opacity-30">
          ›
        </button>
      </div>

      {/* ── 天気（今日のみ） ── */}
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

      {/* ── 気分スコア ── */}
      <div className="card space-y-3">
        <p className="section-title">気分スコア（1–10）</p>
        {form.moodScore > 0 && (
          <div className="text-center py-1">
            <span className="text-4xl">{MOOD_EMOJI[form.moodScore]}</span>
            <p className="text-sm text-slate-500 mt-1">{MOOD_LABEL[form.moodScore]}</p>
          </div>
        )}
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => set('moodScore', n)}
              className={`flex flex-col items-center py-2 rounded-xl border-2 transition-all active:scale-95 ${
                form.moodScore === n
                  ? MOOD_BG[n] + ' border-opacity-100 shadow-sm scale-105'
                  : 'bg-slate-50 border-slate-100'
              }`}>
              <span className="text-xl leading-none">{MOOD_EMOJI[n]}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 px-1">
          <span>😭 とても辛い</span><span>とても良い 🤩</span>
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
      <div className="card">
        <p className="section-title mb-2">精神科の服薬</p>
        <div className="flex gap-2">
          <button onClick={() => set('medication', true)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              form.medication === true ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>
            ✓ 服薬済み
          </button>
          <button onClick={() => set('medication', false)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              form.medication === false ? 'bg-red-400 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>
            ✗ 未服薬
          </button>
        </div>
      </div>

      {/* ── その他の薬 ── */}
      <div className="card space-y-2">
        <p className="section-title">その他の薬・市販薬</p>

        {/* 追加済みリスト */}
        {otherMeds.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">💊</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{m.name}</p>
                {(m.dose || m.time) && (
                  <p className="text-xs text-slate-400">
                    {[m.dose, m.time].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => removeMed(m.id)} className="text-slate-300 hover:text-red-400 text-lg ml-2 flex-shrink-0">
              ×
            </button>
          </div>
        ))}

        {/* プリセットクイック追加 */}
        {!showMedForm && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PRESET_MEDS.map(name => (
              <button key={name} onClick={() => addMed(name)}
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

        {/* カスタム入力フォーム */}
        {showMedForm && (
          <div className="border border-indigo-100 rounded-xl p-3 space-y-2 bg-indigo-50">
            <input value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))}
              placeholder="薬の名前（例：イブプロフェン）"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <input value={newMed.dose} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))}
                placeholder="用量（例：1錠）"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
              <input type="time" value={newMed.time} onChange={e => setNewMed(m => ({ ...m, time: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowMedForm(false); setNewMed({ name: '', dose: '', time: '' }) }}
                className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm">
                キャンセル
              </button>
              <button onClick={() => addMed()} disabled={!newMed.name.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold disabled:opacity-40">
                追加
              </button>
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
            value === n ? bgs[n] + ' border-opacity-100 shadow-sm scale-105' : 'bg-slate-50 border-slate-100'
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
  if (error) return <button onClick={onReload} className="text-xs text-amber-500 underline">再取得</button>
  if (!weather) return null
  return (
    <button onClick={onReload} className="text-right active:opacity-70">
      <p className="text-3xl leading-none">{weather.emoji}</p>
      <p className="text-xs text-slate-500 mt-0.5">{weather.text} {weather.temperature}°C</p>
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
