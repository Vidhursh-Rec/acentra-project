import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, MapPin, Share2, Scale, AlertCircle, Loader2 } from 'lucide-react'
import RuleBreakdownCard from '../components/RuleBreakdownCard'
import GeoInvestigationMap from '../components/GeoInvestigationMap'
import EntityGraphView from '../components/EntityGraphView'
import ActionPanel from '../components/ActionPanel'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function fmtDate(iso) {
    return iso ? new Date(iso).toLocaleString() : '—'
}

export default function FlagDetail() {
    const { id } = useParams()
    const [flag, setFlag] = useState(null)
    const [err, setErr] = useState(null)

    const fetchFlag = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/flags/${id}`)
            setFlag(data)
        } catch (e) {
            setErr(e.response?.data?.detail || 'Failed to load flag.')
        }
    }, [id])

    useEffect(() => { fetchFlag() }, [fetchFlag])

    if (err) return (
        <div className="p-8 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle size={16} /> {err}
        </div>
    )
    if (!flag) return (
        <div className="p-8 flex items-center gap-2 text-[#8b949e] text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading investigation…
        </div>
    )

    const geoReason = flag.reasons?.find(r => r.rule_name === 'GeoRule')
    const txn = flag.transaction

    return (
        <div className="p-6 space-y-5 animate-fadeIn">
            {/* Back */}
            <Link to="/flags" className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white transition-colors">
                <ArrowLeft size={13} /> Back to Queue
            </Link>

            {/* Title row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-white">
                        Flag #{flag.flag_id}
                        <span className="ml-2 text-sm font-mono text-[#8b949e]">
                            txn: {flag.txn_id?.slice(0, 12)}…
                        </span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`badge-${flag.risk_level}`}>
                            {flag.risk_level}
                        </span>
                        <span className={`status-${flag.status}`}>
                            {flag.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-[#8b949e]">{fmtDate(flag.created_at)}</span>
                    </div>
                </div>

                {/* Score strip */}
                <div className="flex items-center gap-4 text-center">
                    <div>
                        <div className="text-2xl font-extrabold text-white">{flag.total_score}</div>
                        <div className="text-[10px] text-[#8b949e]">Rule Score / 100</div>
                    </div>
                    <div className="w-px h-10 bg-[#30363d]" />
                    <div>
                        <div className="text-2xl font-extrabold text-purple-400">
                            {(flag.ml_anomaly_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-[#8b949e]">ML Anomaly</div>
                    </div>
                </div>
            </div>

            {/* Transaction meta strip */}
            {txn && (
                <div className="card2 flex flex-wrap gap-6 text-xs">
                    {[
                        ['User', txn.user_id],
                        ['Amount', `$${Number(txn.amount).toLocaleString()}`],
                        ['City', txn.city],
                        ['Device', txn.device_id],
                        ['Merchant', txn.merchant],
                        ['Time', fmtDate(txn.timestamp)],
                    ].map(([k, v]) => (
                        <div key={k}>
                            <div className="text-[#8b949e]">{k}</div>
                            <div className="text-white font-medium mt-0.5">{v || '—'}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Main 2-column layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                {/* LEFT: Rule breakdown */}
                <div className="card space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Scale size={15} className="text-brand-500" />
                        <h2 className="text-sm font-semibold text-white">Rule & ML Breakdown</h2>
                    </div>
                    <RuleBreakdownCard
                        reasons={flag.reasons}
                        shap={flag.shap_attributions}
                        totalScore={flag.total_score}
                        mlScore={flag.ml_anomaly_score}
                    />
                </div>

                {/* RIGHT: Geo map OR placeholder */}
                <div className="card space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <MapPin size={15} className="text-red-400" />
                        <h2 className="text-sm font-semibold text-white">Geo-Temporal Investigation</h2>
                    </div>
                    {geoReason?.evidence ? (
                        <GeoInvestigationMap evidence={geoReason.evidence} />
                    ) : (
                        <div className="flex items-center justify-center h-40 text-[#8b949e] text-xs text-center">
                            No impossible travel detected for this transaction.
                        </div>
                    )}
                </div>
            </div>

            {/* Entity graph */}
            <div className="card space-y-2">
                <div className="flex items-center gap-2 mb-2">
                    <Share2 size={15} className="text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">Transaction Entity Graph</h2>
                    <span className="text-[10px] text-[#8b949e]">
                        ({flag.graph_neighborhood?.nodes?.length ?? 0} nodes · {flag.graph_neighborhood?.links?.length ?? 0} edges)
                    </span>
                </div>
                <EntityGraphView graphData={flag.graph_neighborhood} />
            </div>

            {/* Action panel */}
            <div className="card">
                <h2 className="text-sm font-semibold text-white mb-3">Reviewer Action</h2>
                <ActionPanel
                    flagId={flag.flag_id}
                    currentStatus={flag.status}
                    onActionDone={fetchFlag}
                />
            </div>
        </div>
    )
}
