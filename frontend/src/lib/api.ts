import { edgeApiBase, supabase } from './supabase';

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? 'ERROR';
    this.details = details;
  }
}

export async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface RequestOptions { method?: string; body?: unknown }

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = opts;
  const headers: Record<string, string> = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${edgeApiBase}${path}`, { method, headers, body: payload });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.message ?? `Request failed (${res.status})`, res.status, data?.error?.code, data?.error?.details);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
  async download(path: string): Promise<Blob> {
    const token = await getToken();
    if (!token) throw new ApiError('Sign in to download a controlled dataset.', 401);
    const res = await fetch(`${edgeApiBase}${path}`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError('Download failed', res.status);
    return res.blob();
  },
};
