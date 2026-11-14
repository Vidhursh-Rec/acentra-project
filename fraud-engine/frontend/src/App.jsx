import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, AlertTriangle, ClipboardList, Activity, Shield
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import FlagList from './pages/FlagList'
import FlagDetail from './pages/FlagDetail'
import AuditLog from './pages/AuditLog'
import './index.css'

function Sidebar() {
  const links = [
    { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/flags', label: 'Flag Queue', Icon: AlertTriangle },
    { to: '/audit', label: 'Audit Log', Icon: ClipboardList },
  ]
  return (
    <aside className="w-60 flex-shrink-0 bg-[#161b22] border-r border-[#30363d] min-h-screen flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#30363d]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center animate-glow">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">FraudGuard</div>
            <div className="text-[10px] text-[#8b949e]">Detection Console</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="px-4 py-4 border-t border-[#30363d]">
        <div className="flex items-center gap-2 text-xs text-[#8b949e]">
          <Activity size={12} className="text-green-400 animate-pulse" />
          Engine online
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/flags" element={<FlagList />} />
            <Route path="/flags/:id" element={<FlagDetail />} />
            <Route path="/audit" element={<AuditLog />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
