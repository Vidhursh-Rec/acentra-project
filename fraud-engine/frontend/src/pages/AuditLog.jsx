import { useEffect, useState } from 'react'
import axios from 'axios'
import { RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function fmtDate(iso) {
    return iso ? new Date(iso).toLocaleString() : '—'
}

const DECISION_COLORS = {
    CONFIRMED_FRAUD: 'text-red-400',
    CLEARED: 'text-green-400',
    ESCALATED: 'text-yellow-400',
}

export default function AuditLog() {
    const [actions, setActions] = useState([])
    const [loading, setLoading] = useState(false)

    const fetch = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API}/audit?limit=100`)
            setActions(data)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    useEffect(() => { fetch() }, [])

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Audit Log</h1>
                    <p className="text-xs text-[#8b949e] mt-0.5">{actions.length} review actions</p>
                </div>
                <button onClick={fetch} className="btn-ghost flex items-center gap-1.5">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#30363d]">
                                {['Action', 'Flag', 'Reviewer', 'Decision', 'Comment', 'Time'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[#8b949e] text-xs">Loading…</td>
                                </tr>
                            )}
                            {!loading && actions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[#8b949e] text-xs">
                                        No review actions yet. Start investigating flags!
                                    </td>
                                </tr>
                            )}
                            {!loading && actions.map(a => (
                                <tr key={a.action_id} className="hover:bg-[#1c2230] transition-colors">
                                    <td className="px-4 py-3 text-xs text-[#8b949e] font-mono">#{a.action_id}</td>
                                    <td className="px-4 py-3 text-xs text-brand-500 font-mono">#{a.flag_id}</td>
                                    <td className="px-4 py-3 text-xs text-[#e6edf3]">{a.reviewer}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold ${DECISION_COLORS[a.decision] || 'text-white'}`}>
                                            {a.decision.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[#8b949e] max-w-xs truncate">
                                        {a.comment || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[#8b949e] whitespace-nowrap">
                                        {fmtDate(a.acted_at)}
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
