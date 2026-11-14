import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AlertTriangle, Clock, Zap } from 'lucide-react'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const blueIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconAnchor: [12, 41], popupAnchor: [1, -34],
})

function fmtTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtNum(n) {
    if (n === undefined || n === null) return '—'
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function GeoInvestigationMap({ evidence }) {
    if (!evidence) return null

    const {
        prev_city, curr_city,
        prev_time, curr_time,
        distance_km, elapsed_min, implied_speed_kmh, threshold_kmh,
        prev_coords, curr_coords,
    } = evidence

    const [lat1, lon1] = prev_coords || []
    const [lat2, lon2] = curr_coords || []
    const hasCoords = lat1 != null && lat2 != null

    const center = hasCoords
        ? [(lat1 + lat2) / 2, (lon1 + lon2) / 2]
        : [20, 0]

    const overThreshold = implied_speed_kmh > threshold_kmh

    return (
        <div className="space-y-4 animate-fadeIn">
            {/* Map */}
            {hasCoords && (
                <div className="rounded-xl overflow-hidden border border-[#30363d]" style={{ height: 260 }}>
                    <MapContainer
                        center={center}
                        zoom={3}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[lat1, lon1]} icon={blueIcon}>
                            <Popup>{prev_city} (Origin)</Popup>
                        </Marker>
                        <Marker position={[lat2, lon2]} icon={redIcon}>
                            <Popup>{curr_city} (Destination)</Popup>
                        </Marker>
                        <Polyline
                            positions={[[lat1, lon1], [lat2, lon2]]}
                            pathOptions={{ color: '#f87171', weight: 2, dashArray: '8 6', opacity: 0.9 }}
                        />
                    </MapContainer>
                </div>
            )}

            {/* Teleport summary panel */}
            <div className="card2 space-y-3">
                {/* Journey row */}
                <div className="flex items-center justify-between text-sm">
                    <div className="text-center">
                        <div className="text-blue-400 font-semibold text-base">{prev_city || '—'}</div>
                        <div className="text-[#8b949e] flex items-center gap-1 justify-center mt-0.5">
                            <Clock size={11} /> {fmtTime(prev_time)}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-3">
                        <div className="w-full border-t border-dashed border-[#30363d] relative">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#1c2230] px-2">
                                <Zap size={14} className="text-yellow-400" />
                            </div>
                        </div>
                        <div className="text-[10px] text-[#8b949e] mt-1">{fmtNum(distance_km)} km</div>
                    </div>

                    <div className="text-center">
                        <div className="text-red-400 font-semibold text-base">{curr_city || '—'}</div>
                        <div className="text-[#8b949e] flex items-center gap-1 justify-center mt-0.5">
                            <Clock size={11} /> {fmtTime(curr_time)}
                        </div>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Distance" value={`${fmtNum(distance_km)} km`} />
                    <Stat label="Elapsed" value={`${fmtNum(elapsed_min)} min`} />
                    <Stat
                        label="Implied Speed"
                        value={`${fmtNum(implied_speed_kmh)} km/h`}
                        highlight="danger"
                    />
                    <Stat label="Threshold" value={`${fmtNum(threshold_kmh)} km/h`} />
                </div>

                {/* Status badge */}
                {overThreshold && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-900/20 border border-red-800/50 px-3 py-2">
                        <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                        <span className="text-red-300 text-xs font-semibold tracking-wide">
                            🚨 IMPOSSIBLE TRAVEL DETECTED
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

function Stat({ label, value, highlight }) {
    return (
        <div className="bg-[#0d1117] rounded-lg px-3 py-2 border border-[#30363d]">
            <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">{label}</div>
            <div className={`font-semibold mt-0.5 ${highlight === 'danger' ? 'text-red-400' : 'text-white'}`}>
                {value}
            </div>
        </div>
    )
}
