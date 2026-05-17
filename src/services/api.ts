/* ─── API Service Layer for MindPulse ───
   Designed for Flask/FastAPI backend integration.
   Falls back to localStorage mock when backend is unreachable.
*/

// ── Config ──
// PROD_URL is always the real Render backend — env vars can OVERRIDE only if they are valid
const PROD_URL = 'https://mindpulse-tn0d.onrender.com';

// ── API Base URL Resolution ──
// In PRODUCTION (Vercel): always use the hardcoded Render URL — ignore .env
// In DEVELOPMENT (localhost): use env var override if set, else localhost:8000
const _rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '')
  .replace(/\/api\/?$/, '').replace(/\/$/, '');

const _BASE = import.meta.env.DEV
  ? (_rawEnvUrl || 'http://localhost:8000')   // dev: env var → fallback localhost
  : PROD_URL;                                  // prod: ALWAYS Render — never localhost

const API_BASE  = `${_BASE}/api`;
const AUTH_BASE = `${_BASE}/api`;
const USE_MOCK  = import.meta.env.VITE_USE_MOCK === 'true';
const REQ_TIMEOUT = import.meta.env.DEV ? 15000 : 30000;


// ── Wake up Render on production page load ──
if (!import.meta.env.DEV) {
  fetch(`${PROD_URL}/api/health`, { method: 'GET' }).catch(() => {});
}

// ── Token helpers ──
function getToken(): string | null {
  try { return localStorage.getItem('mp_token'); } catch { return null; }
}
function setToken(t: string) { localStorage.setItem('mp_token', t); }
function clearToken() { localStorage.removeItem('mp_token'); }

// ── Custom error ──
export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Generic request with timeout ──
async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers as Record<string, string> };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);

  try {
    const res = await fetch(url, { ...opts, headers, signal: controller.signal });
    clearTimeout(timer);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, body?.error ?? body?.detail ?? body?.message ?? 'Request failed', body);
    }
    return body as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new ApiError(0, 'Request timed out — backend may be waking up');
    throw err;
  }
}

// ── Types ──
export interface AuthResponse {
  success: boolean;
  user?:    ApiUser;
  token?:   string;
  error?:   string;
}

export interface ApiUser {
  id:             string;
  name:           string;
  email:          string;
  avatarInitials: string;
  joinedDate:     string;
}

export interface ApiCheckInEntry {
  id:               string;
  date:             string;
  mood:             'great' | 'good' | 'okay' | 'low' | 'struggling';
  journalText:      string;
  stressLevel:      number;
  sleepQuality:     number;
  tags:             string[];
  emotions:         string[];    // display labels e.g. ["Anxious", "Hopeful"]
  riskScore:        number;      // 0–100
  dominantEmotion?: string;
  emotionBreakdown?: {
    anxiety: number; sadness: number; anger: number;
    joy: number; hope: number; exhaustion: number;
  };
  insights?:    string;
  suggestions?: string[];
  crisisFlag?:  boolean;
  wordCount?:   number;
  riskLevel?:   string;
}

export interface CheckInPayload {
  mood:         string;
  journalText:  string;
  stressLevel:  number;
  sleepQuality: number;
  energyLevel:  number;
  tags:         string[];
  voiceUsed?:   boolean;
}

export interface WeeklyScore {
  day:   string;
  score: number;
}

export interface DashboardSummary {
  latestScore:   number;
  avgRiskScore:  number;
  riskLevel:     'low' | 'moderate' | 'high';
  weeklyScores:  WeeklyScore[];
  streakDays:    number;
  topEmotions:   [string, number][];
}

// ──────────────────────────────────────────
//  AUTH
// ──────────────────────────────────────────

export async function apiSignup(name: string, email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) return mockSignup(name, email, password);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
    const res = await fetch(`${AUTH_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.json().catch(() => null);
    if (res.status === 409) return { success: false, error: body?.detail ?? 'An account with this email already exists.' };
    if (!res.ok) {
      const msg = body?.detail ?? body?.error ?? `Server error (${res.status}). Please try again.`;
      return { success: false, error: msg };
    }
    if (body?.token) setToken(body.token);
    return { success: true, user: body?.user, token: body?.token };
  } catch (err: any) {
    if (err?.name === 'AbortError')
      return { success: false, error: 'Request timed out. The server may be waking up — please wait 30 seconds and try again.' };
    return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) return mockLogin(email, password);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
    const res = await fetch(`${AUTH_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.json().catch(() => null);
    if (res.status === 401)
      return { success: false, error: body?.detail ?? 'Incorrect email or password.' };
    if (!res.ok) {
      const msg = body?.detail ?? body?.error ?? `Server error (${res.status}). Please try again.`;
      return { success: false, error: msg };
    }
    if (body?.token) setToken(body.token);
    return { success: true, user: body?.user, token: body?.token };
  } catch (err: any) {
    if (err?.name === 'AbortError')
      return { success: false, error: 'Request timed out. The server may be waking up — please wait 30 seconds and try again.' };
    return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function apiLogout(): Promise<void> {
  clearToken();
  if (USE_MOCK) return;
  try {
    await fetch(`${AUTH_BASE}/auth/logout`, { method: 'POST' });
  } catch { /* ignore */ }
}

// ── Phone OTP Auth (Backend — Fast2SMS) ───────────────────────────────────
// No Firebase needed. OTP is sent via Fast2SMS through our Python backend.

export async function apiSendOtp(phone: string): Promise<{ success: boolean; error?: string; message?: string; dev_mode?: boolean }> {
  try {
    const res = await fetch(`${AUTH_BASE}/auth/send-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, error: body?.detail ?? 'Failed to send OTP.' };
    return { success: true, message: body.message, dev_mode: body.dev_mode ?? false };
  } catch {
    return { success: false, error: 'Server unreachable. Is the backend running?' };
  }
}

export async function apiVerifyOtp(phone: string, otp: string, name?: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${AUTH_BASE}/auth/verify-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, name }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, error: body?.detail ?? 'OTP verification failed.' };
    if (body.token) setToken(body.token);
    return { success: true, user: body.user, token: body.token };
  } catch {
    return { success: false, error: 'Server unreachable. Please try again.' };
  }
}


export async function apiGetCurrentUser(): Promise<ApiUser | null> {
  if (USE_MOCK) return mockGetCurrentUser();
  const token = getToken();
  // No token = not logged in
  if (!token) return null;
  // Old mock_ tokens are phantom accounts (localStorage-only) — clear them and force real login
  if (token.startsWith('mock_')) {
    clearToken();
    localStorage.removeItem('mindpulse_session');
    localStorage.removeItem('mindpulse_users');
    return null;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
    const res = await fetch(`${AUTH_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      clearToken();
      return null;  // Token expired or invalid — not logged in
    }
    return res.json() as Promise<ApiUser>;
  } catch {
    return null;  // Network error — treat as logged out
  }
}

// ──────────────────────────────────────────
//  CHECK-INS
// ──────────────────────────────────────────

export async function apiSubmitCheckIn(data: CheckInPayload): Promise<ApiCheckInEntry> {
  if (USE_MOCK) return mockSubmitCheckIn(data);
  try {
    return await request<ApiCheckInEntry>('/checkins', {
      method: 'POST',
      body: JSON.stringify({
        text:       data.journalText,
        mood:       data.mood,
        stress:     data.stressLevel,
        sleep:      data.sleepQuality,
        energy:     data.energyLevel ?? 5,
        tags:       data.tags,
        voice_used: data.voiceUsed ?? false,
      }),
    });
  } catch (err: any) {
    // 401/403 = mock token rejected OR network error → use real ML via /api/analyze (no auth!)
    const isAuthError = err?.status === 401 || err?.status === 403;
    const isNetError  = !err?.status;
    if (isAuthError || isNetError) {
      console.warn('[MindPulse] Checkin auth failed — calling /api/analyze directly (no auth needed)');
      return mlAnalyzeAndSaveLocally(data);
    }
    throw err;
  }
}

/**
 * Calls POST /api/analyze (public — no auth token required).
 * Used when the user has a mock token but we still want real ML scores.
 * Saves the result to localStorage so Dashboard/History still populate.
 */
async function mlAnalyzeAndSaveLocally(data: CheckInPayload): Promise<ApiCheckInEntry> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
    const res = await fetch(`${API_BASE}/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:   data.journalText,
        mood:   data.mood,
        stress: data.stressLevel,
        sleep:  data.sleepQuality,
        energy: data.energyLevel ?? 5,
        tags:   data.tags,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error('analyze endpoint failed');
    const ml = await res.json();

    // Map ML emotions object → array of emotion label strings
    const emoArr: string[] = Object.entries(ml.emotions || {})
      .filter(([, v]) => (v as number) > 0.08)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

    const entry: ApiCheckInEntry = {
      id:               Math.random().toString(36).slice(2),
      date:             new Date().toISOString(),
      mood:             data.mood as any,
      journalText:      data.journalText,
      stressLevel:      data.stressLevel,
      sleepQuality:     data.sleepQuality,
      tags:             data.tags,
      emotions:         emoArr.slice(0, 4),
      riskScore:        ml.score,
      dominantEmotion:  ml.dominant_emotion ?? emoArr[0]?.toLowerCase() ?? 'neutral',
      emotionBreakdown: ml.emotions ?? {},
      insights:         ml.insights ?? '',
      suggestions:      ml.suggestions ?? [],
      crisisFlag:       ml.crisis_flag ?? false,
      wordCount:        ml.word_count ?? 0,
      riskLevel:        ml.risk_level ?? (ml.score >= 70 ? 'low' : ml.score >= 45 ? 'moderate' : 'high'),
    };

    // Persist to localStorage so Dashboard/History show this entry
    const stored = getEntries();
    saveEntries([entry, ...stored]);
    console.log(`[MindPulse] ML score via /api/analyze: ${ml.score} (${ml.risk_level})`);
    return entry;
  } catch (e) {
    // /api/analyze also unreachable (truly offline) → simple keyword fallback
    console.warn('[MindPulse] /api/analyze also failed — using offline keyword fallback');
    return mockSubmitCheckIn(data);
  }
}


export async function apiGetCheckIns(): Promise<ApiCheckInEntry[]> {
  if (USE_MOCK) return mockGetCheckIns();
  try {
    return await request<ApiCheckInEntry[]>('/checkins');
  } catch (err: any) {
    console.warn('[MindPulse] GET /checkins failed:', err?.message);
    return [];  // Return empty — don't restore stale localStorage data
  }
}

export async function apiGetCheckInsByDate(from: string, to: string): Promise<ApiCheckInEntry[]> {
  if (USE_MOCK) return mockGetCheckInsByDate(from, to);
  return request<ApiCheckInEntry[]>(`/checkins?from=${from}&to=${to}`);
}

export async function apiGetCheckIn(id: string): Promise<ApiCheckInEntry> {
  if (USE_MOCK) return mockGetCheckIn(id);
  return request<ApiCheckInEntry>(`/checkins/${id}`);
}

// ──────────────────────────────────────────
//  VOICE ANALYSIS
// ──────────────────────────────────────────

export interface VoiceAnalysisResult {
  voice_emotion:    string;   // 'calm' | 'joy' | 'sadness' | 'anger' | 'anxiety' | 'neutral'
  voice_confidence: number;   // 0.0 – 1.0
  risk_offset:      number;   // negative = worse, positive = better
  ml_enabled:       boolean;
}

export async function apiAnalyzeVoice(audioBlob: Blob): Promise<VoiceAnalysisResult> {
  if (USE_MOCK) {
    // Deterministic mock so UI can be tested without backend
    return { voice_emotion: 'neutral', voice_confidence: 0.0, risk_offset: 0, ml_enabled: false };
  }
  const token = getToken();
  const form = new FormData();
  form.append('audio', audioBlob, 'voice.webm');

  const res = await fetch(`${API_BASE}/voice-analyze`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? 'Voice analysis failed', body);
  }
  return res.json() as Promise<VoiceAnalysisResult>;
}

// ──────────────────────────────────────────
//  DASHBOARD / ANALYTICS
// ──────────────────────────────────────────

export async function apiGetDashboardSummary(): Promise<DashboardSummary> {
  if (USE_MOCK) return mockGetDashboardSummary();
  return request<DashboardSummary>('/dashboard/summary');
}

export async function apiGetWeeklyScores(): Promise<WeeklyScore[]> {
  if (USE_MOCK) return mockGetWeeklyScores();
  return request<WeeklyScore[]>('/dashboard/weekly-scores');
}

// ──────────────────────────────────────────
//  PROFILE
// ──────────────────────────────────────────

export async function apiUpdateProfile(updates: { name?: string; email?: string }): Promise<ApiUser> {
  if (USE_MOCK) return mockUpdateProfile(updates);
  return request<ApiUser>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function apiExportData(): Promise<ApiCheckInEntry[]> {
  if (USE_MOCK) return mockGetCheckIns();
  return request<ApiCheckInEntry[]>('/export/data');
}

// ──────────────────────────────────────────
//  MOCK / FALLBACK (localStorage)
// ──────────────────────────────────────────

const USERS_KEY   = 'mindpulse_users';
const ENTRIES_KEY = 'mindpulse_entries';
const SESSION_KEY = 'mindpulse_session';

interface StoredUser { id: string; name: string; email: string; passwordHash: string; }

function getUsers(): StoredUser[] { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; } }
function saveUsers(u: StoredUser[]) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function fakeHash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }

function getEntries(): ApiCheckInEntry[] { try { return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]'); } catch { return []; } }
function saveEntries(e: ApiCheckInEntry[]) { localStorage.setItem(ENTRIES_KEY, JSON.stringify(e)); }

// Wellness score — HIGH is better (70–100 = healthy, 0–44 = at risk)
function computeRiskScore(mood: string, stressLevel: number, sleepQuality: number, text: string): number {
  let score = 75; // start from neutral-healthy baseline
  // Mood penalty
  if (mood === 'struggling') score -= 35;
  else if (mood === 'low')   score -= 20;
  else if (mood === 'okay')  score -= 8;
  else if (mood === 'good')  score += 5;
  else if (mood === 'great') score += 12;
  // Stress penalty (high stress = lower wellness)
  score -= (stressLevel - 1) * 2.5;
  // Sleep bonus/penalty
  score += (sleepQuality - 5) * 1.5;
  // Text analysis
  const neg = ['anxious','anxiety','stressed','overwhelmed','hopeless','depressed','lonely','tired','burnout','panic','cry','crying'];
  const pos = ['happy','grateful','calm','excited','proud','accomplished','loved','motivated','hopeful'];
  const lower = text.toLowerCase();
  neg.forEach(w => { if (lower.includes(w)) score -= 4; });
  pos.forEach(w => { if (lower.includes(w)) score += 3; });
  return Math.min(100, Math.max(0, Math.round(score)));
}

function detectEmotions(mood: string, text: string, stress: number): string[] {
  const lower = text.toLowerCase();
  const emotions: string[] = [];
  const checks: [string, string][] = [
    ['happy','Happy'], ['grateful','Grateful'], ['calm','Calm'],
    ['anxious','Anxious'], ['anxiety','Anxious'], ['stressed','Stressed'],
    ['tired','Tired'], ['hopeful','Hopeful'], ['motivated','Motivated'],
    ['overwhelm','Overwhelmed'], ['sad','Sad'], ['lonely','Lonely'],
    ['excited','Excited'], ['proud','Proud'], ['worried','Worried'],
  ];
  checks.forEach(([kw, label]) => { if (lower.includes(kw) && !emotions.includes(label)) emotions.push(label); });
  if (emotions.length === 0) {
    if (mood === 'great') emotions.push('Content');
    else if (mood === 'okay') emotions.push(stress >= 6 ? 'Stressed' : 'Neutral');
    else emotions.push('Distressed');
  }
  return emotions.slice(0, 4);
}

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function mockSignup(name: string, email: string, password: string): Promise<AuthResponse> {
  await delay(900);
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return { success: false, error: 'An account with this email already exists.' };
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  saveUsers([...users, { id, name, email, passwordHash: fakeHash(password) }]);
  const token = 'mock_' + id;
  setToken(token);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, userId: id }));
  return {
    success: true,
    user: { id, name, email, avatarInitials: initials(name), joinedDate: new Date().toISOString() },
    token,
  };
}

async function mockLogin(email: string, password: string): Promise<AuthResponse> {
  await delay(800);
  const users = getUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!found) return { success: false, error: 'No account found with this email.' };
  if (found.passwordHash !== fakeHash(password)) return { success: false, error: 'Incorrect password.' };
  const token = 'mock_' + found.id;
  setToken(token);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, userId: found.id }));
  return {
    success: true,
    user: { id: found.id, name: found.name, email: found.email, avatarInitials: initials(found.name), joinedDate: new Date().toISOString() },
    token,
  };
}

function mockGetCurrentUser(): ApiUser | null {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) return null;
  const users = getUsers();
  const u = users.find(x => x.id === session.userId);
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, avatarInitials: initials(u.name), joinedDate: new Date().toISOString() };
}

async function mockSubmitCheckIn(data: CheckInPayload): Promise<ApiCheckInEntry> {
  await delay(1100);
  const riskScore = computeRiskScore(data.mood, data.stressLevel, data.sleepQuality, data.journalText);
  const emotions  = detectEmotions(data.mood, data.journalText, data.stressLevel);
  const dominant  = emotions[0]?.toLowerCase() ?? 'neutral';
  const riskLevel = riskScore >= 70 ? 'low' : riskScore >= 45 ? 'moderate' : 'high';
  const entry: ApiCheckInEntry = {
    id: Math.random().toString(36).slice(2),
    date: new Date().toISOString(),
    mood: data.mood as any,
    journalText: data.journalText,
    stressLevel: data.stressLevel,
    sleepQuality: data.sleepQuality,
    tags: data.tags,
    emotions,
    riskScore,
    dominantEmotion: dominant,
    emotionBreakdown: { anxiety: 0, sadness: 0, anger: 0, joy: 0, hope: 0, exhaustion: 0 },
    insights: `Your wellness score is ${riskScore}/100. ${ riskScore >= 70 ? 'You are doing well!' : riskScore >= 45 ? 'Some stress detected — take a moment for yourself.' : 'You seem to be having a tough time. Please reach out for support.' }`,
    suggestions: riskScore < 45 ? ['Consider talking to someone you trust', 'Try the breathing exercise in Resources', 'Take a 10-minute walk outside'] : ['Keep up your healthy habits', 'Log your mood daily for better insights', 'Check out the Resources page'],
    crisisFlag: riskScore <= 20,
    wordCount: data.journalText.split(/\s+/).filter(Boolean).length,
    riskLevel,
  };
  const entries = getEntries();
  saveEntries([entry, ...entries]);
  return entry;
}

function mockGetCheckIns(): ApiCheckInEntry[] { return getEntries(); }

function mockGetCheckInsByDate(from: string, to: string): ApiCheckInEntry[] {
  return getEntries().filter(e => e.date.slice(0, 10) >= from && e.date.slice(0, 10) <= to);
}

function mockGetCheckIn(id: string): ApiCheckInEntry {
  const entry = getEntries().find(e => e.id === id);
  if (!entry) throw new ApiError(404, 'Check-in not found');
  return entry;
}

function mockGetWeeklyScores(): WeeklyScore[] {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const entries = getEntries();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const match = entries.find(e => e.date.slice(0, 10) === iso);
    return { day: DAYS[d.getDay()], score: match ? match.riskScore : 0 };
  });
}

function mockGetDashboardSummary(): DashboardSummary {
  const entries = getEntries();
  const latestScore  = entries[0]?.riskScore ?? 0;
  const avgRiskScore = entries.length ? Math.round(entries.reduce((a, e) => a + e.riskScore, 0) / entries.length) : 0;
  // High score = better wellness (corrected logic)
  const riskLevel: 'low' | 'moderate' | 'high' = latestScore >= 70 ? 'low' : latestScore >= 45 ? 'moderate' : 'high';
  const weeklyScores = mockGetWeeklyScores();

  const emotionMap: Record<string, number> = {};
  entries.slice(0, 5).forEach(e => e.emotions.forEach(em => { emotionMap[em] = (emotionMap[em] || 0) + 1; }));
  const topEmotions = Object.entries(emotionMap).sort((a, b) => b[1] - a[1]).slice(0, 4) as [string, number][];

  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (entries.some(e => e.date.slice(0, 10) === d.toISOString().slice(0, 10))) streakDays++;
    else if (i > 0) break;
  }

  return { latestScore, avgRiskScore, riskLevel, weeklyScores, streakDays, topEmotions };
}

async function mockUpdateProfile(updates: { name?: string; email?: string }): Promise<ApiUser> {
  await delay(500);
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!session?.userId) throw new ApiError(401, 'Not authenticated');
  const users = getUsers();
  const idx = users.findIndex(u => u.id === session.userId);
  if (idx === -1) throw new ApiError(404, 'User not found');
  if (updates.name)  users[idx].name  = updates.name;
  if (updates.email) users[idx].email = updates.email;
  saveUsers(users);
  return { id: users[idx].id, name: users[idx].name, email: users[idx].email, avatarInitials: initials(users[idx].name), joinedDate: new Date().toISOString() };
}

export { clearToken as apiClearToken, getToken as apiGetToken };

// ──────────────────────────────────────────
//  MINDPULSE ANALYSIS ENGINE  (FastAPI backend)
// ──────────────────────────────────────────

const ANALYSIS_BASE = import.meta.env.VITE_ANALYSIS_URL
  ?? (import.meta.env.DEV ? 'http://localhost:8000' : 'https://mindpulse-tn0d.onrender.com');

export interface AnalysisPayload {
  text: string;          // journal text + voice transcript combined
  mood: string;          // excellent | good | okay | low | struggling
  stress: number;        // 0–10
  sleep: number;         // 0–10
  energy: number;        // 0–10
  tags?: string[];
  voice_used?: boolean;
}

export interface EmotionBreakdown {
  anxiety: number;
  sadness: number;
  anger: number;
  joy: number;
  hope: number;
  exhaustion: number;
}

export interface AnalysisResult {
  score: number;                                           // 0–100
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;                                      // 0.0–1.0
  emotions: EmotionBreakdown;
  dominant_emotion: string;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;                                 // -1.0 to 1.0
  text_depth: 'shallow' | 'moderate' | 'reflective' | 'deep';
  insights: string;
  suggestions: string[];
  crisis_flag: boolean;
  word_count: number;
}

/**
 * Send check-in data to the MindPulse NLP backend.
 * Falls back to a basic local score if backend is offline.
 */
export async function analyzeCheckIn(payload: AnalysisPayload): Promise<AnalysisResult> {
  try {
    const res = await fetch(`${ANALYSIS_BASE}/api/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail ?? `Analysis server error: ${res.status}`);
    }
    return res.json() as Promise<AnalysisResult>;
  } catch (e) {
    // Graceful fallback when backend is offline
    console.warn('[MindPulse] Analysis backend unreachable — using local fallback', e);
    return localFallbackAnalysis(payload);
  }
}

/** Basic local fallback when the Python backend is offline */
function localFallbackAnalysis(p: AnalysisPayload): AnalysisResult {
  const moodOffset: Record<string, number> = { excellent: 20, good: 12, okay: 0, low: -12, struggling: -22 };
  const vitalsScore = Math.round((5 - p.stress) * 2 + (p.sleep - 5) * 1.6 + (p.energy - 5) * 1.2);
  const score = Math.max(0, Math.min(100, 50 + (moodOffset[p.mood] ?? 0) + vitalsScore));
  const risk_level = score >= 75 ? 'low' : score >= 55 ? 'moderate' : score >= 35 ? 'high' : 'critical';
  return {
    score, risk_level,
    confidence: 0.6,
    emotions: { anxiety: 0, sadness: 0, anger: 0, joy: 0, hope: 0, exhaustion: 0 },
    dominant_emotion: 'neutral',
    sentiment_label: 'neutral',
    sentiment_score: 0,
    text_depth: 'shallow',
    insights: 'Analysis server is offline. Your vitals score has been calculated locally.',
    suggestions: ['Start the MindPulse backend server to get full AI analysis', 'Run: python -m uvicorn main:app --reload in mindpulse_backend/', 'Check your internet connection'],
    crisis_flag: false,
    word_count: p.text.split(/\s+/).filter(Boolean).length,
  };
}

/** Health check — verify analysis backend is reachable */
export async function pingAnalysisBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${ANALYSIS_BASE}/api/health`, { method: 'GET' });
    return res.ok;
  } catch { return false; }
}
