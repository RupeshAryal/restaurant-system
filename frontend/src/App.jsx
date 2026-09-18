import { useCallback, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { ModalProvider } from './ModalContext.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Income from './pages/Income.jsx'
import Expenses from './pages/Expenses.jsx'
import Staff from './pages/Staff.jsx'

const PAGES = { home: Home, dashboard: Dashboard, income: Income, expenses: Expenses, staff: Staff }

export default function App() {
  const { isAuthed } = useAuth()

  if (!isAuthed) return <LoginScreen />

  return (
    <ModalProvider>
      <AuthedApp />
    </ModalProvider>
  )
}

function AuthedApp() {
  const [page, setPage] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  function navigate(p) {
    setPage(p)
    setSidebarOpen(false)
  }

  const Page = PAGES[page]

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={navigate} open={sidebarOpen} />
      <div className="main">
        <TopBar page={page} onMenuClick={() => setSidebarOpen((o) => !o)} onDataChanged={bumpRefresh} />
        <div className="content">
          <Page refreshKey={refreshKey} onDataChanged={bumpRefresh} />
        </div>
      </div>
    </div>
  )
}
