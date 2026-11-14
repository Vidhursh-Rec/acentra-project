// Admin login: centred logo, title, subtitle, outlined fields, pill button (design-refs pattern).
import { HeartPulse } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, getAdmin, setAdmin } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (getAdmin()) return <Navigate to="/patients" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token: string; name: string; id: string }>("/auth/login", {
        body: { role: "management", id, password },
      });
      setAdmin({ token: r.token, name: r.name, id: r.id });
      navigate("/patients", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? err.message : "Invalid admin ID or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-green-100">
            <HeartPulse className="size-7 text-brand" />
          </span>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance text-ink">CareBridge Management</h1>
          <p className="mt-1 text-muted-text">Monitor discharge plans and doctor workload.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="id">Admin ID</Label>
            <Input id="id" value={id} onChange={(e) => setId(e.target.value)} placeholder="A001" className="h-11" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
          </div>
          {error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}
          <Button type="submit" disabled={busy || !id || !password} className="h-11 w-full rounded-full">
            {busy ? <Spinner /> : null} Log in
          </Button>
        </div>
      </form>
    </div>
  );
}
