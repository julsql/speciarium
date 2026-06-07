async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    let payload: unknown;
    try { payload = await res.json(); } catch { payload = await res.text(); }
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).payload = payload;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type QueryParams = Record<string, unknown> | object;

export const api = {
  get: <T>(url: string, params?: QueryParams) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params as Record<string, unknown>)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return request<T>(url + qs);
  },
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T = void>(url: string) => request<T>(url, { method: 'DELETE' }),
  postForm: <T>(url: string, form: FormData) =>
    fetch(url, { method: 'POST', credentials: 'include', body: form }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.status === 204 ? (undefined as T) : (r.json() as Promise<T>);
    }),
};
