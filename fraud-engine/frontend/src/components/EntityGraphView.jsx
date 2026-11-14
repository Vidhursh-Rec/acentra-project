import { useRef, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const TYPE_COLORS = {
    txn: '#4f6ef7',
    user: '#10b981',
    device: '#f59e0b',
    pmt: '#a78bfa',
    addr: '#f87171',
    unknown: '#8b949e',
}

export default function EntityGraphView({ graphData }) {
    const fgRef = useRef()
    const { nodes = [], links = [] } = graphData || {}

    const data = useMemo(() => ({
        nodes: nodes.map(n => ({ ...n })),
        links: links.map(l => ({
            source: l.source,
            target: l.target,
            rel: l.rel,
        })),
    }), [graphData])

    const paintNode = useCallback((node, ctx, globalScale) => {
        const color = TYPE_COLORS[node.type] || TYPE_COLORS.unknown
        const r = node.flagged ? 8 : 5

        // Outer glow for flagged
        if (node.flagged) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI)
            ctx.fillStyle = 'rgba(239,68,68,0.18)'
            ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
        ctx.fillStyle = node.flagged ? '#ef4444' : color
        ctx.fill()
        ctx.strokeStyle = '#30363d'
        ctx.lineWidth = 1
        ctx.stroke()

        // Label
        const fontSize = Math.max(7 / globalScale, 3)
        ctx.font = `${fontSize}px Inter, sans-serif`
        ctx.fillStyle = '#e6edf3'
        ctx.textAlign = 'center'
        ctx.fillText(
            node.label?.length > 14 ? node.label.slice(0, 12) + '…' : node.label,
            node.x,
            node.y + r + fontSize * 1.2,
        )
    }, [])

    if (!nodes.length) {
        return (
            <div className="flex items-center justify-center h-[320px] text-[#8b949e] text-sm">
                No graph data available.
            </div>
        )
    }

    return (
        <div className="rounded-xl overflow-hidden border border-[#30363d] bg-[#0d1117]">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-[#30363d]">
                {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'unknown').map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5 text-[10px] text-[#8b949e]">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        {type}
                    </div>
                ))}
                <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e]">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30" />
                    flagged
                </div>
            </div>
            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                width={560}
                height={300}
                backgroundColor="#0d1117"
                nodeCanvasObject={paintNode}
                nodeCanvasObjectMode={() => 'replace'}
                linkColor={() => '#30363d'}
                linkWidth={1}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkLabel={link => link.rel}
                cooldownTicks={120}
                onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
            />
        </div>
    )
}
