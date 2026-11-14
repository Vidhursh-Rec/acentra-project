import { useEffect, useState } from 'react'
import axios from 'axios'
import { AlertTriangle, TrendingUp, Shield, CheckCircle2, Clock, Play, Square } from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function KPI({ label, value, icon: Icon, color = 'text-white', sub }) {
    return (
        <div className="card flex items-start gap-4 animate-fadeIn">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-[#0d1117] ${color}`}>
                <Icon size={18} />
            </div>
            <div>
                <div className="text-2xl font-extrabold text-white">{value ?? '—'}</div>
                <div className="text-xs text-[#8b949e] mt-0.5">{label}</div>
                {sub && <div className="text-[10px] text-[#8b949e]">{sub}</div>}
            </div>
        </div>
    )
}

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [recentFlags, setRecent] = useState([])
    const [simRunning, setSimRun] = useState(false)
    const [simMsg, setSimMsg] = useState('')

    const fetchStats = async () => {
        try {
            const [s, f] = await Promise.all([
                axios.get(`${API}/stats`),
                axios.get(`${API}/flags?limit=20`),
            ])
            setStats(s.data)
            setRecent(f.data)
        } catch { /* silent */ }
    }

    useEffect(() => {
        fetchStats()
        const t = setInterval(fetchStats, 5000)
        return () => clearInterval(t)
    }, [])

    const toggleSim = async () => {
        const ep = simRunning ? 'stop' : 'start'
        try {
            const r = await axios.post(`${API}/simulate/${ep}`)
            setSimRun(r.data.running)
            setSimMsg(r.data.message)
            setTimeout(() => setSimMsg(''), 3000)
        } catch (e) {
            setSimMsg('Simulator request failed.')
        }
    }

    // Build mini sparkline from recent flags (score distribution)
    const chartData = recentFlags.slice(0, 15).reverse().map((f, i) => ({
        i,
        score: f.total_score,
        ml: Math.round(f.ml_anomaly_score * 100),
    }))

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Detection Dashboard</h1>
                    <p className="text-xs text-[#8b949e] mt-0.5">Real-time fraud signals & system health</p>
                </div>
                <div className="flex items-center gap-3">
                    {simMsg && (
                        <span className="text-xs text-[#8b949e] animate-fadeIn">{simMsg}</span>
                    )}
                    <button
                        onClick={toggleSim}
                        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${simRunning
                                ? 'bg-red-800 hover:bg-red-900 text-white'
                                : 'bg-green-800 hover:bg-green-900 text-white'
                            }`}
                    >
                        {simRunning ? <><Square size={13} /> Stop Simulator</> : <><Play size={13} /> Start Simulator</>}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KPI label="Total Flags" value={stats?.total_flags} icon={Shield} color="text-brand-500" />
                <KPI label="HIGH Risk" value={stats?.high_risk} icon={AlertTriangle} color="text-red-400" />
                <KPI label="Confirmed Fraud" value={stats?.confirmed_fraud} icon={TrendingUp} color="text-orange-400" />
                <KPI label="Pending Review" value={stats?.pending} icon={Clock} color="text-yellow-400" />
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Medium Risk', val: stats?.medium_risk, color: 'text-yellow-400' },
                    { label: 'Low Risk', val: stats?.low_risk, color: 'text-blue-400' },
                    { label: 'Cleared', val: stats?.cleared, color: 'text-green-400' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="card text-center">
                        <div className={`text-xl font-bold ${color}`}>{val ?? '—'}</div>
                        <div className="text-xs text-[#8b949e] mt-0.5">{label}</div>
                    </div>
                ))}
            </div>

            {/* Score sparkline */}
            {chartData.length > 0 && (
                <div className="card">
                    <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
                        Recent Flag Scores
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="i" hide />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip
                                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area type="monotone" dataKey="score" stroke="#4f6ef7" strokeWidth={2} fill="url(#scoreGrad)" dot={false} name="Rule Score" />
                            <Area type="monotone" dataKey="ml" stroke="#a78bfa" strokeWidth={1.5} fillOpacity={0} dot={false} name="ML × 100" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Recent HIGH-risk flags */}
            {recentFlags.filter(f => f.risk_level === 'HIGH').length > 0 && (
                <div className="card">
                    <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                        🚨 High-Risk Alerts
                    </div>
                    <div className="space-y-2">
                        {recentFlags.filter(f => f.risk_level === 'HIGH').slice(0, 5).map(f => (
                            <Link
                                key={f.flag_id}
                                to={`/flags/${f.flag_id}`}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-900/10 border border-red-900/40 hover:border-red-700 transition-colors group"
                            >
                                <div>
                                    <div className="text-sm font-medium text-white group-hover:text-red-300 transition-colors">
                                        Flag #{f.flag_id}
                                    </div>
                                    <div className="text-[10px] text-[#8b949e]">{f.txn_id?.slice(0, 12)}…</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-red-400">{f.total_score}/100</span>
                                    <span className={`status-${f.status}`}>{f.status}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
