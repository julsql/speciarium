import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Auth } from '../api/auth';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        try {
            const me = await Auth.me();
            setUser(me);
        }
        catch {
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { refresh(); }, [refresh]);
    const value = {
        user, loading, refresh,
        login: async (u, p) => { const r = await Auth.login(u, p); setUser(r); return r; },
        signup: async (u, e, p) => { const r = await Auth.signup(u, e, p); setUser(r); return r; },
        demo: async () => { const r = await Auth.demo(); setUser(r); return r; },
        logout: async () => { await Auth.logout(); setUser(null); },
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth doit être utilisé sous AuthProvider');
    return ctx;
}
