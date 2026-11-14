// Screen 3 — all providers (doctors, hospitals, labs) on an OpenStreetMap map, filter by specialty.
import { Building2, FlaskConical, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { AttributionControl, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";

type Provider = {
  id: number; name: string; type: "individual_doctor" | "hospital" | "lab"; specialty: string;
  address: string; phone: string; lat: number; lng: number; disclaimer: string;
};

const TYPE = {
  // Distinct by fill AND shape, not only hue: green dot, larger slate dot, hollow teal ring.
  individual_doctor: { label: "Doctors", color: "#16a34a", fill: "#16a34a", ring: "#ffffff", radius: 7, Icon: Stethoscope },
  hospital: { label: "Hospitals", color: "#475569", fill: "#475569", ring: "#ffffff", radius: 9, Icon: Building2 },
  lab: { label: "Labs", color: "#0f766e", fill: "#ffffff", ring: "#0f766e", radius: 7, Icon: FlaskConical },
};

export default function MapPage() {
  const { data, error } = useLoad(() => api<Provider[]>("/providers/map"));
  const [specialty, setSpecialty] = useState("all");

  const specialties = useMemo(() => [...new Set((data ?? []).map((p) => p.specialty))].sort(), [data]);
  const shown = (data ?? []).filter((p) => specialty === "all" || p.specialty === specialty);
  const counts = (["individual_doctor", "hospital", "lab"] as const).map((t) => ({ t, n: shown.filter((p) => p.type === t).length }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance sm:text-3xl">Hospital map</h1>
          <p className="max-w-[65ch] text-pretty text-muted-text">Provider coverage across Chennai, for monitoring and reassignment context.</p>
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="w-full sm:w-60" aria-label="Specialty"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialties</SelectItem>
            {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="mb-3 flex flex-wrap gap-2 sm:gap-3">
        {counts.map(({ t, n }) => {
          const { label, color, Icon } = TYPE[t];
          return (
            <span key={t} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm">
              <Icon className="size-4" style={{ color }} /> {label}: <b className="tabular-nums">{n}</b>
            </span>
          );
        })}
      </div>

      <div className="isolate overflow-hidden rounded-xl border border-line shadow-sm" style={{ height: "max(24rem, calc(100dvh - 230px))" }}>
        <MapContainer center={[13.03, 80.21]} zoom={12} attributionControl={false} style={{ height: "100%", width: "100%" }}>
          <AttributionControl position="bottomleft" prefix={false} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {shown.map((p) => (
            <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={TYPE[p.type].radius}
              pathOptions={{ color: TYPE[p.type].ring, weight: p.type === "lab" ? 3 : 2, fillColor: TYPE[p.type].fill, fillOpacity: 0.95 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-muted-text">{p.specialty}</div>
                  <div className="mt-1">{p.address}</div>
                  <div>{p.phone}</div>
                  <div className="mt-1 text-xs text-muted-text">{p.disclaimer}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
