import { useState, useEffect } from 'react'
import NavBar from './components/NavBar'
import TodayRecord from './components/TodayRecord'
import TrendGraph from './components/TrendGraph'
import AlertHistory from './components/AlertHistory'
import Settings from './components/Settings'
import { useRecords } from './hooks/useRecords'

export default function App() {
  const [tab, setTab] = useState('today')
  const { unreadCount, refresh, save } = useRecords()

  // Refresh alert badge when switching tabs
  useEffect(() => { refresh() }, [tab])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        {tab === 'today'    && <TodayRecord onSave={save} />}
        {tab === 'trend'    && <TrendGraph />}
        {tab === 'alerts'   && <AlertHistory onRead={refresh} />}
        {tab === 'settings' && <Settings onSave={refresh} />}
      </div>
      <NavBar active={tab} onSelect={setTab} unreadCount={unreadCount} />
    </div>
  )
}
