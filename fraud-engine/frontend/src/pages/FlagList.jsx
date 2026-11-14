import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search, RefreshCw, ChevronRight } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const RISK_OPTIONS = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']
const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED_FRAUD', 'CLEARED', 'ESCALATED']

function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString()
}

export default function FlagList() {
    const [flags, setFlags] = useState([])
    const [risk, setRisk] = useState('ALL')
    const [status, setStatus] = useState('ALL')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)

    const fetch = async () => {
        setLoading(true)
        try {
            const params = {}
            if (risk !== 'ALL') params.risk_level = risk
            if (status !== 'ALL') params.status = status
            const { data } = await axios.get(`${API}/flags`, { params })
            setFlags(data)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    useEffect(() => { fetch() }, [risk, status])

    const filtered = flags.filter(f =>
        !search || f.txn_id.includes(search) || String(f.flag_id).includes(search)
    )

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Flag Queue</h1>
                    <p className="text-xs text-[#8b949e] mt-0.5">{flags.length} total flags</p>
                </div>
                <button onClick={fetch} className="btn-ghost flex items-center gap-1.5">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                    <input
                        className="input pl-8 w-64 text-xs"
                        placeholder="Search by txn_id or flag_id…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Risk filter */}
                <div className="flex gap-1">
                    {RISK_OPTIONS.map(r => (
                        <button
                            key={r}
                            onClick={() => setRisk(r)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${risk === r
                                    ? 'bg-brand-600 text-white'
                                    : 'border border-[#30363d] text-[#8b949e] hover:text-white'
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <select
                    className="input w-48 text-xs"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#30363d] text-left">
                                {['Flag', 'Txn ID', 'Score', 'ML', 'Risk', 'Status', 'Created', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]">
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-[#8b949e] text-xs">Loading…</td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-[#8b949e] text-xs">No flags found.</td>
                                </tr>
                            )}
                            {!loading && filtered.map(f => (
                                <tr key={f.flag_id} className="hover:bg-[#1c2230] transition-colors group">
                                    <td className="px-4 py-3 font-mono text-xs text-[#8b949e]">#{f.flag_id}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-[#8b949e]">
                                        {f.txn_id?.slice(0, 8)}…
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 rounded-full bg-[#0d1117] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${f.total_score}%`,
                                                        background: f.total_score >= 70 ? '#ef4444'
                                                            : f.total_score >= 30 ? '#f59e0b' : '#4f6ef7',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-white">{f.total_score}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-purple-400 font-mono">
                                        {(f.ml_anomaly_score * 100).toFixed(0)}%
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`badge-${f.risk_level}`}>{f.risk_level}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`status-${f.status}`}>{f.status.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[11px] text-[#8b949e] whitespace-nowrap">
                                        {fmtDate(f.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`/flags/${f.flag_id}`}
                                            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Investigate <ChevronRight size={12} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
