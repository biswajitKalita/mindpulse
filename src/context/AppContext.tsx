import {
  createContext, useContext, useReducer, useEffect,
  useRef, useCallback, useMemo, ReactNode, useState,
} from 'react';
import type { AppState, CheckInEntry, User } from '../types';
import {
  apiLogin, apiSignup, apiLogout,
  apiGetCurrentUser, apiSubmitCheckIn, apiGetCheckIns,
  type CheckInPayload,
} from '../services/api';

// ── Helpers ── (module-level — not recreated on every render)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Actions ──
type Action =
  | { type: 'LOGIN';       payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'ADD_ENTRIES'; payload: CheckInEntry[] }
  | { type: 'ADD_ENTRY';   payload: CheckInEntry };

const initialState: AppState = { user: null, entries: [], isAuthenticated: false };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':       return { ...state, user: action.payload, isAuthenticated: true };
    case 'LOGOUT':      return { ...initialState };
    case 'UPDATE_USER': return { ...state, user: state.user ? { ...state.user, ...action.payload } : state.user };
    case 'ADD_ENTRIES': return { ...state, entries: action.payload };
    case 'ADD_ENTRY':   return { ...state, entries: [action.payload, ...state.entries] };
    default:            return state;
  }
}

// ── Context value ──
interface AppContextValue {
  state: AppState;
  loading: boolean;
  login:  (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: { name?: string }) => void;
  submitCheckIn: (data: CheckInPayload) => Promise<CheckInEntry>;
  fetchEntries: () => Promise<void>;
  riskLevel: 'low' | 'moderate' | 'high';
  latestScore: number;
  prevScore: number;
  scoreDelta: number;
  avgRiskScore: number;
  weeklyScores: { day: string; score: number }[];
  streakDays: number;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      const user = await apiGetCurrentUser();
      if (user) {
        dispatch({ type: 'LOGIN', payload: user });
        try {
          const entries = await apiGetCheckIns();
          dispatch({ type: 'ADD_ENTRIES', payload: entries });
        } catch { /* no entries or offline */ }
      }
      setLoading(false);
    })();
  }, []);

  // ── Stable callbacks (don't recreate on every render) ──────────────────────

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      if (res.success && res.user) {
        dispatch({ type: 'LOGIN', payload: res.user });
        try {
          const entries = await apiGetCheckIns();
          dispatch({ type: 'ADD_ENTRIES', payload: entries });
        } catch { /* no entries */ }
      }
      return { success: res.success, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Login failed.' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await apiSignup(name, email, password);
      if (res.success && res.user) dispatch({ type: 'LOGIN', payload: res.user });
      return { success: res.success, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Sign up failed.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const submitCheckIn = useCallback(async (data: CheckInPayload): Promise<CheckInEntry> => {
    const entry = await apiSubmitCheckIn(data);
    dispatch({ type: 'ADD_ENTRY', payload: entry });
    return entry;
  }, []);

  const fetchEntries = useCallback(async (): Promise<void> => {
    try {
      const entries = await apiGetCheckIns();
      dispatch({ type: 'ADD_ENTRIES', payload: entries });
    } catch { /* offline or error */ }
  }, []);

  const updateUser = useCallback((updates: { name?: string }) => {
    const patch: Partial<User> = { ...updates };
    if (updates.name) patch.avatarInitials = getInitials(updates.name);
    dispatch({ type: 'UPDATE_USER', payload: patch });
    try {
      const session = JSON.parse(localStorage.getItem('mindpulse_session') || 'null');
      if (session?.userId) {
        const users: any[] = JSON.parse(localStorage.getItem('mindpulse_users') || '[]');
        const idx = users.findIndex((u: any) => u.id === session.userId);
        if (idx !== -1 && updates.name) {
          users[idx].name = updates.name;
          localStorage.setItem('mindpulse_users', JSON.stringify(users));
        }
      }
    } catch { /* ignore storage errors */ }
  }, []);

  // ── Derived values (memoised — only recompute when entries change) ──────────

  const latestScore = useMemo(() => state.entries[0]?.riskScore ?? 0, [state.entries]);
  const prevScore   = useMemo(() => state.entries[1]?.riskScore ?? latestScore, [state.entries, latestScore]);

  const { scoreDelta, avgRiskScore, riskLevel } = useMemo(() => {
    const delta = state.entries.length > 1 ? latestScore - prevScore : 0;
    const avg   = state.entries.length
      ? Math.round(state.entries.reduce((a, e) => a + e.riskScore, 0) / state.entries.length)
      : 0;
    const risk: 'low' | 'moderate' | 'high' =
      latestScore >= 70 ? 'low' : latestScore >= 45 ? 'moderate' : 'high';
    return { scoreDelta: delta, avgRiskScore: avg, riskLevel: risk };
  }, [state.entries, latestScore, prevScore]);

  // 7-day chart data (loop over 7 items — cheap, but still memoised)
  const weeklyScores = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso   = d.toISOString().slice(0, 10);
      const match = state.entries.find(e => e.date.slice(0, 10) === iso);
      return { day: DAYS[d.getDay()], score: match ? match.riskScore : 0 };
    });
  }, [state.entries]);

  // Streak (up to 365-iteration loop — memoised for real perf gain)
  const streakDays = useMemo(() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (state.entries.some(e => e.date.slice(0, 10) === d.toISOString().slice(0, 10))) {
        s++;
      } else if (i > 0) break;
    }
    return s;
  }, [state.entries]);

  // ── Stable context value (prevents all consumers re-rendering on unrelated state) ──
  const value = useMemo<AppContextValue>(() => ({
    state, loading,
    login, signup, logout, updateUser, submitCheckIn, fetchEntries,
    riskLevel, latestScore, prevScore, scoreDelta, avgRiskScore,
    weeklyScores, streakDays,
  }), [
    state, loading,
    login, signup, logout, updateUser, submitCheckIn, fetchEntries,
    riskLevel, latestScore, prevScore, scoreDelta, avgRiskScore,
    weeklyScores, streakDays,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
