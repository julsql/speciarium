async function request(input, init) {
    const res = await fetch(input, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        ...init,
    });
    if (!res.ok) {
        let payload;
        try {
            payload = await res.json();
        }
        catch {
            payload = await res.text();
        }
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.payload = payload;
        throw err;
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
export const api = {
    get: (url, params) => {
        const qs = params
            ? '?' + new URLSearchParams(Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => [k, String(v)])).toString()
            : '';
        return request(url + qs);
    },
    post: (url, body) => request(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: (url, body) => request(url, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
    del: (url) => request(url, { method: 'DELETE' }),
    postForm: (url, form) => fetch(url, { method: 'POST', credentials: 'include', body: form }).then(async (r) => {
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.status === 204 ? undefined : r.json();
    }),
};
