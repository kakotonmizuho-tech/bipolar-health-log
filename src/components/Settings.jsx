import { useState, useEffect } from 'react'
import { getSettings, saveSettings, exportRecords, clearAllData } from '../utils/storage'

const DEFAULT_MOOD_EMOJI = ['', '😭', '😢', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩']
const DOSE_UNITS = ['錠', '包', 'ml', 'mg', '回', '本', '個']

export default function Settings({ onSave }) {
  const [form, setForm] = useState({ googleApiKey: '', googleClientId: '', calendarId: '' })
  const [saved, setSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [calendarList, setCalendarList] = useState([])
  const [loadingCals, setLoadingCals] = useState(false)

  // マイ薬リスト
  const [myMeds, setMyMeds] = useState([])
  const [newMed, setNewMed] = useState({ name: '', defaultDose: '1', unit: '錠' })
  const [showMedForm, setShowMedForm] = useState(false)

  // カスタム顔文字
  const [moodEmoji, setMoodEmoji] = useState([...DEFAULT_MOOD_EMOJI])

  useEffect(() => {
    const s = getSettings()
    setForm({
      googleApiKey:  s.googleApiKey  ?? import.meta.env.VITE_GOOGLE_API_KEY  ?? '',
      googleClientId: s.googleClientId ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      calendarId:    s.calendarId    ?? 'primary',
    })
    setMyMeds(s.myMeds ?? [])
    if (s.moodEmoji) {
      const arr = [...DEFAULT_MOOD_EMOJI]
      Object.entries(s.moodEmoji).forEach(([k, v]) => { arr[Number(k)] = v })
      setMoodEmoji(arr)
    }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    // moodEmoji を {1:'😭', ...} 形式で保存
    const emojiMap = {}
    moodEmoji.forEach((e, i) => { if (i > 0) emojiMap[i] = e })
    saveSettings({ ...form, myMeds, moodEmoji: emojiMap })
    setSaved(true)
    onSave?.()
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    clearAllData()
    setShowClearConfirm(false)
    onSave?.()
  }

  const fetchCalendarList = async () => {
    if (!window.gapi?.client?.calendar) return
    setLoadingCals(true)
    try {
      const resp = await window.gapi.client.calendar.calendarList.list()
      setCalendarList(resp.result.items ?? [])
    } catch {}
    finally { setLoadingCals(false) }
  }

  const addMed = () => {
    if (!newMed.name.trim()) return
    setMyMeds(prev => [...prev, { id: `med-${Date.now()}`, ...newMed, name: newMed.name.trim() }])
    setNewMed({ name: '', defaultDose: '1', unit: '錠' })
    setShowMedForm(false)
  }
  const removeMed = (id) => setMyMeds(prev => prev.filter(m => m.id !== id))

  const resetEmoji = () => setMoodEmoji([...DEFAULT_MOOD_EMOJI])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 pt-2">設定</h1>

      {/* ── マイ薬リスト ── */}
      <div className="card space-y-3">
        <div>
          <p className="font-semibold text-slate-700 text-sm">💊 マイ薬リスト</p>
          <p className="text-xs text-slate-400 mt-0.5">よく飲む薬を登録しておくと、記録時にすぐ選べます</p>
        </div>

        {myMeds.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-700">{m.name}</p>
              <p className="text-xs text-slate-400">通常 {m.defaultDose}{m.unit}</p>
            </div>
            <button onClick={() => removeMed(m.id)}
              className="text-slate-300 hover:text-red-400 text-xl leading-none">×</button>
          </div>
        ))}

        {showMedForm ? (
          <div className="border border-indigo-100 rounded-xl p-3 space-y-2 bg-indigo-50">
            <input value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))}
              placeholder="薬の名前（例：リチウム）"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            <div className="flex gap-2">
              <input value={newMed.defaultDose}
                onChange={e => setNewMed(m => ({ ...m, defaultDose: e.target.value }))}
                placeholder="用量"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
              <select value={newMed.unit} onChange={e => setNewMed(m => ({ ...m, unit: e.target.value }))}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                {DOSE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowMedForm(false)}
                className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm">
                キャンセル
              </button>
              <button onClick={addMed} disabled={!newMed.name.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold disabled:opacity-40">
                追加
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowMedForm(true)}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm hover:border-indigo-300 hover:text-indigo-500 transition-colors">
            + 薬を追加
          </button>
        )}
      </div>

      {/* ── 気分スコア 顔文字カスタマイズ ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-700 text-sm">😊 気分スコアの顔文字</p>
            <p className="text-xs text-slate-400 mt-0.5">1〜10に好きな絵文字を割り当てられます</p>
          </div>
          <button onClick={resetEmoji} className="text-xs text-slate-400 underline">リセット</button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <div key={n} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 font-medium">{n}</span>
              <input
                value={moodEmoji[n]}
                onChange={e => {
                  const arr = [...moodEmoji]
                  // 絵文字1文字だけ受け付ける
                  const chars = [...e.target.value]
                  arr[n] = chars[chars.length - 1] ?? DEFAULT_MOOD_EMOJI[n]
                  setMoodEmoji(arr)
                }}
                className="w-full text-center text-2xl border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                maxLength={4}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Googleカレンダー ── */}
      <div className="card space-y-3">
        <div>
          <p className="font-semibold text-slate-700 text-sm">📅 Googleカレンダー連携</p>
          <p className="text-xs text-slate-400 mt-0.5">
            スコープ: <code className="bg-slate-100 px-1 rounded text-[10px]">calendar.readonly</code>
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1 font-medium">Google APIキー</label>
          <input type="password" value={form.googleApiKey}
            onChange={e => set('googleApiKey', e.target.value)} placeholder="AIza..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1 font-medium">OAuth クライアントID</label>
          <input type="password" value={form.googleClientId}
            onChange={e => set('googleClientId', e.target.value)} placeholder="xxxx.apps.googleusercontent.com"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500 font-medium">カレンダーID</label>
            <button onClick={fetchCalendarList} disabled={loadingCals}
              className="text-[10px] text-indigo-500 underline disabled:opacity-40">
              {loadingCals ? '取得中...' : 'カレンダー一覧を取得'}
            </button>
          </div>
          <input type="text" value={form.calendarId}
            onChange={e => set('calendarId', e.target.value)} placeholder="primary（デフォルト）"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono" />
          {calendarList.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
              {calendarList.map(cal => (
                <button key={cal.id} onClick={() => set('calendarId', cal.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 ${form.calendarId === cal.id ? 'bg-indigo-50' : ''}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cal.backgroundColor ?? '#6366f1' }} />
                  <span className="font-medium text-slate-700 truncate">{cal.summary}</span>
                  {cal.primary && <span className="text-[10px] text-indigo-400 ml-auto shrink-0">メイン</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 保存ボタン ── */}
      <button onClick={handleSave}
        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
        }`}>
        {saved ? '✓ 設定を保存しました' : '設定を保存'}
      </button>

      {/* ── データ管理 ── */}
      <div className="card space-y-3">
        <p className="font-semibold text-slate-700 text-sm">データ管理</p>
        <button onClick={exportRecords}
          className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
          ⬇️ 記録をJSONでエクスポート
        </button>
        {!showClearConfirm ? (
          <button onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
            🗑️ すべてのデータを削除
          </button>
        ) : (
          <div className="border border-red-200 rounded-xl p-3 space-y-2">
            <p className="text-sm text-red-600 font-medium text-center">本当に削除しますか？</p>
            <p className="text-xs text-red-400 text-center">この操作は取り消せません</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium">キャンセル</button>
              <button onClick={handleClear}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">削除する</button>
            </div>
          </div>
        )}
      </div>

      {/* ── アプリ情報 ── */}
      <div className="card text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700">双極性障害ヘルスログ</p>
        <p className="text-xs text-slate-400">v1.1.0 • データはこのデバイスにのみ保存されます</p>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          このアプリは医療的診断を行うものではありません。<br />
          気になる症状は必ず主治医にご相談ください。
        </p>
      </div>
    </div>
  )
}
