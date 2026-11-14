import { BarChart2, Brain } from 'lucide-react'

const RULE_COLORS = {
    VelocityRule: '#4f6ef7',
    AmountRule: '#f59e0b',
    GeoRule: '#ef4444',
    GraphRule: '#a78bfa',
}

const MAX_SCORES = {
    VelocityRule: 25,
    AmountRule: 30,
    GeoRule: 25,
    GraphRule: 20,
}

export default function RuleBreakdownCard({ reasons = [], shap = [], totalScore = 0, mlScore = 0 }) {
    return (
        <div className="space-y-5">
            {/* Rules section */}
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                    <BarChart2 size={13} /> Rule Score Breakdown
                </div>
                {reasons.length === 0 ? (
                    <p className="text-[#8b949e] text-sm">No rules fired.</p>
                ) : (
                    <div className="space-y-3">
                        {reasons.map(r => {
                            const max = MAX_SCORES[r.rule_name] || 30
                            const pct = Math.round((r.score / max) * 100)
                            const color = RULE_COLORS[r.rule_name] || '#8b949e'
                            return (
                                <div key={r.id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-[#e6edf3]">
                                            {r.rule_name.replace('Rule', '')}
                                        </span>
                                        <span className="text-xs font-bold" style={{ color }}>+{r.score}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[#0d1117] overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%`, background: color }}
                                        />
                                    </div>
                                    {r.reason && (
                                        <p className="text-[10px] text-[#8b949e] mt-1 leading-relaxed">{r.reason}</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Score total */}
                <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between">
                    <span className="text-xs text-[#8b949e]">Rule Total</span>
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-[#0d1117] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-red-500"
                                style={{ width: `${totalScore}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-white">{totalScore}/100</span>
                    </div>
                </div>
            </div>

            {/* ML SHAP section */}
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                    <Brain size={13} /> ML Anomaly · SHAP Attribution
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="text-2xl font-extrabold text-purple-400">
                        {(mlScore * 100).toFixed(0)}%
                    </div>
                    <div>
                        <div className="text-xs text-[#8b949e]">Anomaly Probability</div>
                        <div className="h-1.5 w-32 rounded-full bg-[#0d1117] mt-1 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
                                style={{ width: `${mlScore * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
                {shap.length > 0 ? (
                    <div className="space-y-1.5">
                        {shap.slice(0, 6).map(s => {
                            const isPos = s.value >= 0
                            const pct = Math.min(Math.abs(s.value) * 200, 100)
                            return (
                                <div key={s.feature} className="flex items-center gap-2 text-xs">
                                    <div className="w-28 text-[#8b949e] truncate">{s.feature}</div>
                                    <div className="flex-1 h-1.5 rounded-full bg-[#0d1117] overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${pct}%`,
                                                background: isPos ? '#ef4444' : '#10b981',
                                            }}
                                        />
                                    </div>
                                    <div className={`w-12 text-right font-mono ${isPos ? 'text-red-400' : 'text-green-400'}`}>
                                        {isPos ? '+' : ''}{s.value.toFixed(3)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-[#8b949e] text-xs">SHAP values not available.</p>
                )}
            </div>
        </div>
    )
}
