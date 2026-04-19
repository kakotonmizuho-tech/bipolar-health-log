import { useState, useEffect } from 'react'
import { getSettings, saveSettings, exportRecords, clearAllData } from '../utils/storage'

export default function Settings({ onSave }) {
  const [form, setForm] = useState({ googleApiKey: '', googleClientId: '', calendarId: '' })
  const [saved, setSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [calendarList, setCalendarList] = useState([])
  const [loadingCals, setLoadingCals] = useState(false)

  useEffect(() => {
    const s = getSettings()
    setForm({
      googleApiKey: s.googleApiKey ?? import.meta.env.VITE_GOOGLE_API_KEY ?? '',
      googleClientId: s.googleClientId ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      calendarId: s.calendarId ?? 'primary',
    })
  }, [])

  const fetchCalendarList = async () => {
    if (!window.gapi?.client?.calendar) return
    setLoadingCals(true)
    try {
      const resp = await window.gapi.client.calendar.calendarList.list()
      setCalendarList(resp.result.items ?? [])
    } catch {
      // silent
    } finally {
      setLoadingCals(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    saveSettings(form)
    setSaved(true)
    onSave?.()
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    clearAllData()
    setShowClearConfirm(false)
    onSave?.()
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 pt-2">設定</h1>

      {/* Google Calendar */}
      <div className="card space-y-3">
        <div>
          <p className="font-semibold text-slate-700 text-sm">Googleカレンダー連携</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Google Cloud ConsoleでAPIキーとOAuthクライアントIDを取得してください。
            スコープ: <code className="bg-slate-100 px-1 rounded text-[10px]">calendar.readonly</code>
          </p>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1 font-medium">Google APIキー</label>
          <input
            type="password"
            value={form.googleApiKey}
            onChange={e => set('googleApiKey', e.target.value)}
            placeholder="AIza..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1 font-medium">OAuth クライアントID</label>
          <input
            type="password"
            value={form.googleClientId}
            onChange={e => set('googleClientId', e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500 font-medium">カレンダーID</label>
            <button onClick={fetchCalendarList} disabled={loadingCals}
              className="text-[10px] text-indigo-500 underline disabled:opacity-40">
              {loadingCals ? '取得中...' : 'カレンダー一覧を取得'}
            </button>
          </div>
          <input
            type="text"
            value={form.calendarId}
            onChange={e => set('calendarId', e.target.value)}
            placeholder="primary（デフォルト）"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
          />
          {calendarList.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
              {calendarList.map(cal => (
                <button key={cal.id} onClick={() => set('calendarId', cal.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 ${
                    form.calendarId === cal.id ? 'bg-indigo-50' : ''
                  }`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cal.backgroundColor ?? '#6366f1' }} />
                  <span className="font-medium text-slate-700 truncate">{cal.summary}</span>
                  {cal.primary && <span className="text-[10px] text-indigo-400 ml-auto shrink-0">メイン</span>}
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            「カレンダー一覧を取得」で選択できます。空欄の場合はメインカレンダーを使用。
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">設定手順:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
            <li>Google Cloud Console でプロジェクトを作成</li>
            <li>Calendar API を有効化</li>
            <li>認証情報 → APIキー を作成</li>
            <li>認証情報 → OAuth 2.0クライアントID を作成（種類: ウェブアプリ）</li>
            <li>承認済みJavaScriptオリジンにこのアプリのURLを追加</li>
          </ol>
        </div>
      </div>

      {/* Save button */}
      <button onClick={handleSave}
        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
        }`}>
        {saved ? '✓ 設定を保存しました' : '設定を保存'}
      </button>

      {/* Data management */}
      <div className="card space-y-3">
        <p className="font-semibold text-slate-700 text-sm">データ管理</p>

        <button onClick={exportRecords}
          className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
          <span>⬇️</span> 記録をJSONでエクスポート
        </button>

        {!showClearConfirm ? (
          <button onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
            <span>🗑️</span> すべてのデータを削除
          </button>
        ) : (
          <div className="border border-red-200 rounded-xl p-3 space-y-2">
            <p className="text-sm text-red-600 font-medium text-center">本当に削除しますか？</p>
            <p className="text-xs text-red-400 text-center">この操作は取り消せません</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium">
                キャンセル
              </button>
              <button onClick={handleClear}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                削除する
              </button>
            </div>
          </div>
        )}
      </div>

      {/* App info */}
      <div className="card text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700">双極性障害ヘルスログ</p>
        <p className="text-xs text-slate-400">v1.0.0 • データはこのデバイスにのみ保存されます</p>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          このアプリは医療的診断を行うものではありません。<br />
          気になる症状は必ず主治医にご相談ください。
        </p>
      </div>
    </div>
  )
}
