const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "carebridge.admin";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Admin = { token: string; name: string; id: string };

export function getAdmin(): Admin | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Admin) : null;
  } catch {
    return null;
  }
}

export function setAdmin(a: Admin | null) {
  try {
    if (a) localStorage.setItem(TOKEN_KEY, JSON.stringify(a));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked: session lasts for this tab only
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const admin = getAdmin();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: {
        ...(admin ? { Authorization: `Bearer ${admin.token}` } : {}),
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the CareBridge server.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && admin) {
      setAdmin(null);
      window.location.assign("/login");
    }
    const d = data?.detail;
    throw new ApiError(res.status, typeof d === "string" ? d : d?.message ?? `Error ${res.status}`);
  }
  return data as T;
}
