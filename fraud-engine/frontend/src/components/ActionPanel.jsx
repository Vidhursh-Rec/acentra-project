import { useState } from 'react'
import axios from 'axios'
import { CheckCircle2, XCircle, ArrowUpCircle, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ActionPanel({ flagId, currentStatus, onActionDone }) {
    const [comment, setComment] = useState('')
    const [reviewer, setReviewer] = useState('analyst@fraudguard.io')
    const [loading, setLoading] = useState(null)
    const [toast, setToast] = useState(null)

    const submit = async (decision) => {
        setLoading(decision)
        try {
            await axios.patch(`${API}/flags/${flagId}`, {
                reviewer,
                decision,
                comment,
            })
            setToast({ type: 'success', msg: `Marked as ${decision.replace('_', ' ')}` })
            setComment('')
            onActionDone?.()
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.detail || 'Request failed' })
        } finally {
            setLoading(null)
            setTimeout(() => setToast(null), 3500)
        }
    }

    const isDone = ['CONFIRMED_FRAUD', 'CLEARED', 'ESCALATED'].includes(currentStatus)

    return (
        <div className="space-y-3">
            {/* Toast */}
            {toast && (
                <div className={`rounded-lg px-3 py-2 text-sm font-medium animate-fadeIn ${toast.type === 'success'
                        ? 'bg-green-900/30 border border-green-700 text-green-300'
                        : 'bg-red-900/30 border border-red-700 text-red-300'
                    }`}>
                    {toast.msg}
                </div>
            )}

            {/* Reviewer ID */}
            <div>
                <label className="text-[10px] text-[#8b949e] uppercase tracking-wider block mb-1">Reviewer ID</label>
                <input
                    className="input text-sm"
                    value={reviewer}
                    onChange={e => setReviewer(e.target.value)}
                    placeholder="analyst@company.com"
                />
            </div>

            {/* Comment */}
            <div>
                <label className="text-[10px] text-[#8b949e] uppercase tracking-wider block mb-1">Comment</label>
                <textarea
                    className="input resize-none text-sm"
                    rows={3}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Investigation notes…"
                />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
                <button
                    className="btn-danger flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDone || loading !== null}
                    onClick={() => submit('CONFIRMED_FRAUD')}
                >
                    {loading === 'CONFIRMED_FRAUD' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Confirm Fraud
                </button>

                <button
                    className="btn-success flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDone || loading !== null}
                    onClick={() => submit('CLEARED')}
                >
                    {loading === 'CLEARED' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Clear Flag
                </button>

                <button
                    className="btn-warn flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDone || loading !== null}
                    onClick={() => submit('ESCALATED')}
                >
                    {loading === 'ESCALATED' ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                    Escalate
                </button>
            </div>

            {isDone && (
                <p className="text-xs text-[#8b949e]">
                    This flag has already been reviewed ({currentStatus.replace('_', ' ')}).
                </p>
            )}
        </div>
    )
}
