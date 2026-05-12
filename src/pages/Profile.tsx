import { useState } from 'react';
import {
  User, Mail, Calendar, Shield, Bell, Download,
  LogOut, Edit3, CheckCircle2, Award, Flame,
  Activity, Info, ChevronRight, Lock, FileJson,
  FileSpreadsheet, Zap, Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MoodPieChart } from '../components/Charts';

interface ProfileProps { onNavigate: (page: string) => void; }

type Tab = 'profile' | 'settings' | 'privacy';

// ── Helpers ──────────────────────────────────────────────────────────────────
function memberDays(joinedDate?: string): number {
  if (!joinedDate) return 0;
  return Math.floor((Date.now() - new Date(joinedDate).getTime()) / 86400000);
}

function wellnessConfig(score: number) {
  if (score >= 70) return { label: 'Feeling Good',  color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' };
  if (score >= 45) return { label: 'Mild Stress',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' };
  return              { label: 'High Distress',     color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' };
}

// ── Achievement definitions ───────────────────────────────────────────────────
function getAchievements(entries: { date: string; mood: string; stressLevel?: number }[], streak: number) {
  const total = entries.length;
  return [
    { id: 'first',    emoji: '🌱', title: 'First Step',    desc: 'Completed first check-in',   earned: total >= 1 },
    { id: 'week',     emoji: '📅', title: 'Week Warrior',  desc: '7 check-ins total',           earned: total >= 7 },
    { id: 'month',    emoji: '🏆', title: 'Monthly Mind',  desc: '30 check-ins total',          earned: total >= 30 },
    { id: 'streak3',  emoji: '🔥', title: '3-Day Streak',  desc: 'Checked in 3 days in a row',  earned: streak >= 3 },
    { id: 'streak7',  emoji: '⚡', title: 'Unstoppable',   desc: '7-day streak achieved',       earned: streak >= 7 },
    { id: 'streak30', emoji: '💎', title: 'Diamond Mind',  desc: '30-day streak — legendary',   earned: streak >= 30 },
    { id: 'great5',   emoji: '✨', title: 'Happy Spree',   desc: '5 thriving mood entries',     earned: entries.filter(e => e.mood === 'great').length >= 5 },
    { id: 'consistent',emoji:'🎯', title: 'Consistent',   desc: '10 check-ins in 14 days',     earned: (() => {
        const n14 = Date.now() - 14 * 86400000;
        return entries.filter(e => new Date(e.date).getTime() > n14).length >= 10;
      })() },
  ];
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch" aria-checked={checked}
      style={{
        width: 44, height: 24, borderRadius: 99, padding: 0, border: 'none', cursor: 'pointer',
        background: checked ? 'linear-gradient(135deg,#00E5FF,#00B4D8)' : 'rgba(255,255,255,0.08)',
        position: 'relative', transition: 'background 0.25s ease', flexShrink: 0,
        boxShadow: checked ? '0 0 12px rgba(0,229,255,0.4)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? '#060b18' : 'rgba(255,255,255,0.3)',
        transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </button>
  );
}

// ── Setting row ───────────────────────────────────────────────────────────────
function SettingRow({ label, sub, right }: { label: string; sub: string; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', marginBottom: 3, fontFamily: 'Sora,sans-serif' }}>{label}</p>
        <p style={{ fontSize: 11, color: '#8B949E', lineHeight: 1.5 }}>{sub}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = '#00E5FF' }: { icon: any; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{title}</h3>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Profile({ onNavigate }: ProfileProps) {
  const { state, logout, updateUser, avgRiskScore, streakDays } = useApp();
  const { user, entries } = state;

  const [activeTab,  setActiveTab]  = useState<Tab>('profile');
  const [daily,      setDaily]      = useState(true);
  const [weeklyRep,  setWeeklyRep]  = useState(true);
  const [crisisNot,  setCrisisNot]  = useState(true);
  const [editName,   setEditName]   = useState(false);
  const [nameVal,    setNameVal]    = useState(user?.name ?? '');
  const [nameSaved,  setNameSaved]  = useState(false);
  const [logoutConf, setLogoutConf] = useState(false);
  const [exported,   setExported]   = useState<'json'|'csv'|null>(null);

  const handleSaveName = () => {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === user?.name) { setEditName(false); return; }
    updateUser({ name: trimmed });
    setNameVal(trimmed);
    setEditName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const days     = memberDays(user?.joinedDate);
  const wCfg     = wellnessConfig(avgRiskScore);
  const circ     = 2 * Math.PI * 34;
  const ringDash = entries.length ? (avgRiskScore / 100) * circ : 0;
  const achievements = getAchievements(entries, streakDays);
  const earned   = achievements.filter(a => a.earned);

  const joinDate = user?.joinedDate
    ? new Date(user.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'Recently';

  const thisWeek = entries.filter(e => Date.now() - new Date(e.date).getTime() < 7 * 86400000).length;

  // ── Export functions ──────────────────────────────────────────────────────
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ user, entries }, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'mindpulse_data.json'; a.click();
    URL.revokeObjectURL(url);
    setExported('json');
    setTimeout(() => setExported(null), 2500);
  };

  const exportCSV = () => {
    const cols = ['date', 'mood', 'stressLevel', 'sleepQuality', 'riskScore', 'tags', 'emotions'];
    const rows = entries.map(e => [
      e.date, e.mood, e.stressLevel, e.sleepQuality, e.riskScore,
      e.tags.join(';'), e.emotions.join(';'),
    ]);
    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'mindpulse_data.csv'; a.click();
    URL.revokeObjectURL(url);
    setExported('csv');
    setTimeout(() => setExported(null), 2500);
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile',  label: 'Profile',  icon: User   },
    { id: 'settings', label: 'Settings', icon: Bell   },
    { id: 'privacy',  label: 'Privacy',  icon: Shield },
  ];

  const menuTag = (text: string, color = '#00E5FF') => (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {text}
    </span>
  );

  return (
    <div className="min-h-screen grid-bg page-enter page-px" style={{ paddingTop: 100, paddingBottom: 48 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'linear-gradient(90deg,#00E5FF,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Your Account
          </p>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Profile &amp; Settings
          </h1>
        </div>

        {/* ── Profile Hero Card ────────────────────────────────────────────── */}
        <div className="glass" style={{ borderRadius: 28, padding: 'clamp(20px,4vw,32px)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>

            {/* Gradient Avatar */}
            <div style={{
              width: 84, height: 84, borderRadius: 24, flexShrink: 0,
              background: 'linear-gradient(135deg,#00E5FF,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(0,229,255,0.3)',
            }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, fontWeight: 800, color: '#060b18' }}>
                {user?.avatarInitials ?? '?'}
              </span>
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 180 }}>
              {editName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="input-dark"
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 17, fontFamily: 'Sora,sans-serif', fontWeight: 700, flex: 1 }}
                  />
                  <button onClick={handleSaveName} className="btn-primary"
                    style={{ padding: '9px 16px', borderRadius: 10, fontSize: 13, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={13} /> Save
                  </button>
                  <button onClick={() => { setNameVal(user?.name ?? ''); setEditName(false); }}
                    style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B949E', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(17px,3vw,22px)', fontWeight: 800, color: '#FFFFFF' }}>
                    {nameVal || user?.name}
                  </h2>
                  {/* Wellness badge */}
                  {entries.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: wCfg.bg, color: wCfg.color, border: `1px solid ${wCfg.border}` }}>
                      {wCfg.label}
                    </span>
                  )}
                  {nameSaved && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={10} /> Name updated
                    </span>
                  )}
                  <button onClick={() => setEditName(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d444d', padding: 4, borderRadius: 6, transition: 'color .2s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#00E5FF'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#3d444d'}>
                    <Edit3 size={14} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={12} style={{ color: '#3d444d' }} />
                  <span style={{ fontSize: 12, color: '#8B949E' }}>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={12} style={{ color: '#3d444d' }} />
                  <span style={{ fontSize: 12, color: '#8B949E' }}>
                    Member since {joinDate}
                    {days > 0 && <span style={{ color: '#00E5FF', fontWeight: 600 }}> · {days} days</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Avg wellness ring */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.06)" strokeWidth="7" fill="transparent" />
                  <circle cx="40" cy="40" r="34" stroke={wCfg.color} strokeWidth="7" fill="transparent"
                    strokeDasharray={`${ringDash} ${circ}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 5px ${wCfg.color}88)` }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                    {entries.length ? avgRiskScore : '—'}
                  </span>
                  <span style={{ fontSize: 9, color: '#8B949E', marginTop: 2 }}>wellness</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid-4-cols" style={{ marginTop: 24 }}>
            {[
              { label: 'Total Sessions', value: entries.length,     icon: CheckCircle2, color: '#00E5FF' },
              { label: 'Current Streak', value: `${streakDays}d`,   icon: Flame,        color: '#f472b6' },
              { label: 'This Week',      value: thisWeek,            icon: Activity,     color: '#a78bfa' },
              { label: 'Achievements',   value: earned.length,       icon: Award,        color: '#fbbf24' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: '#8B949E', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 16 }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(0,229,255,0.1)' : 'transparent',
                  color: active ? '#00E5FF' : '#8B949E',
                  fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 13,
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 0 0 1px rgba(0,229,255,0.25)' : 'none',
                }}>
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════ TAB: PROFILE ════════════════════════════ */}
        {activeTab === 'profile' && (
          <>
            {/* Achievements */}
            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Award} title="Achievements" color="#fbbf24" />
              <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 16, marginTop: 4 }}>
                {earned.length} / {achievements.length} unlocked
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {achievements.map(({ id, emoji, title, desc, earned: e }) => (
                  <div key={id} style={{
                    padding: '14px 12px', borderRadius: 14, textAlign: 'center',
                    background: e ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${e ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    opacity: e ? 1 : 0.4,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 6, filter: e ? 'none' : 'grayscale(100%)' }}>{emoji}</div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: e ? '#FFFFFF' : '#8B949E', marginBottom: 3, fontFamily: 'Sora,sans-serif' }}>{title}</p>
                    <p style={{ fontSize: 10, color: '#3d444d', lineHeight: 1.4 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood breakdown */}
            {entries.length > 0 && (
              <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
                <SectionHeader icon={Activity} title="Mood Breakdown" color="#a78bfa" />
                <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 16, marginTop: 4 }}>Based on all your check-ins</p>
                <MoodPieChart
                  data={[
                    { mood: 'great',      count: entries.filter(e => e.mood === 'great').length,      label: 'Great' },
                    { mood: 'okay',       count: entries.filter(e => e.mood === 'okay').length,       label: 'Okay' },
                    { mood: 'struggling', count: entries.filter(e => e.mood === 'struggling').length, label: 'Struggling' },
                  ]}
                  size={160}
                />
              </div>
            )}

            {/* About */}
            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Info} title="About MindPulse" color="#00E5FF" />
              <div style={{ marginTop: 12 }}>
                {[
                  { label: 'Version',    value: '2.0.0 · Beta' },
                  { label: 'ML Engine',  value: 'Scikit-Learn + VADER Sentiment' },
                  { label: 'Models',     value: 'Tri-Model Ensemble (text, emotion, crisis)' },
                  { label: 'Frontend',   value: 'React + TypeScript + Vite' },
                  { label: 'Backend',    value: 'FastAPI + Uvicorn' },
                  { label: 'Team',       value: 'Biswajit, Rishi, Ashik, Saidur, Mumon, Jeuti' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#8B949E', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════ TAB: SETTINGS ══════════════════════════ */}
        {activeTab === 'settings' && (
          <>
            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Bell} title="Notifications &amp; Reminders" />
              <div style={{ marginTop: 12 }}>
                <SettingRow
                  label="Daily Check-In Reminder"
                  sub="Get a gentle nudge every day at 8:00 PM"
                  right={<Toggle checked={daily} onChange={() => setDaily(d => !d)} />}
                />
                <SettingRow
                  label="Weekly Progress Report"
                  sub="A wellness summary delivered every Sunday morning"
                  right={<Toggle checked={weeklyRep} onChange={() => setWeeklyRep(r => !r)} />}
                />
                <SettingRow
                  label="Distress Alert Notifications"
                  sub="Notify when your wellness score falls below 35"
                  right={<Toggle checked={crisisNot} onChange={() => setCrisisNot(c => !c)} />}
                />
              </div>
            </div>

            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Zap} title="Quick Actions" color="#a78bfa" />
              <div style={{ marginTop: 12 }}>
                {[
                  { label: 'New Check-In',    sub: 'Start a fresh daily check-in',          page: 'checkin',   icon: CheckCircle2 },
                  { label: 'View History',     sub: 'See all your past sessions',             page: 'history',   icon: Activity },
                  { label: 'Crisis Resources', sub: 'Access helplines & calming exercises',   page: 'resources', icon: Shield },
                ].map(({ label, sub, page, icon: Icon }) => (
                  <button key={page} onClick={() => onNavigate(page)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer', textAlign: 'left', transition: 'opacity 0.2s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} style={{ color: '#a78bfa' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', marginBottom: 2, fontFamily: 'Sora,sans-serif' }}>{label}</p>
                      <p style={{ fontSize: 11, color: '#8B949E' }}>{sub}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: '#3d444d' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => setLogoutConf(true)}
              style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171', fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.07)'; }}>
              <LogOut size={16} /> Sign Out
            </button>
          </>
        )}

        {/* ═══════════════════════ TAB: PRIVACY ════════════════════════════ */}
        {activeTab === 'privacy' && (
          <>
            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Lock} title="Data &amp; Privacy" color="#34d399" />
              <div style={{ marginTop: 12 }}>
                <SettingRow
                  label="Data Encryption"
                  sub="All your data is transmitted over HTTPS, encrypted in transit"
                  right={menuTag('Secured', '#34d399')}
                />
                <SettingRow
                  label="ML Processing"
                  sub="Text analysis runs on our private FastAPI server — never shared with third parties"
                  right={menuTag('Private', '#00E5FF')}
                />
                <SettingRow
                  label="Account Data"
                  sub="Stored in a private database linked to your account email"
                  right={menuTag('Server', '#a78bfa')}
                />
              </div>
            </div>

            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Download} title="Export My Data" color="#00E5FF" />
              <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.7, marginTop: 8, marginBottom: 20 }}>
                Download a full copy of all your check-in history, mood data, and wellness scores.
                Your data belongs to you — always.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={exportJSON}
                  style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: exported === 'json' ? 'rgba(52,211,153,0.12)' : 'rgba(0,229,255,0.08)', border: `1px solid ${exported === 'json' ? 'rgba(52,211,153,0.3)' : 'rgba(0,229,255,0.2)'}`, color: exported === 'json' ? '#34d399' : '#00E5FF', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s', fontFamily: 'Sora,sans-serif' }}>
                  <FileJson size={15} />
                  {exported === 'json' ? 'Downloaded ✓' : 'Export as JSON'}
                </button>
                <button onClick={exportCSV}
                  style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: exported === 'csv' ? 'rgba(52,211,153,0.12)' : 'rgba(167,139,250,0.08)', border: `1px solid ${exported === 'csv' ? 'rgba(52,211,153,0.3)' : 'rgba(167,139,250,0.2)'}`, color: exported === 'csv' ? '#34d399' : '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s', fontFamily: 'Sora,sans-serif' }}>
                  <FileSpreadsheet size={15} />
                  {exported === 'csv' ? 'Downloaded ✓' : 'Export as CSV'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#3d444d', marginTop: 12, textAlign: 'center' }}>
                CSV format is compatible with Excel, Google Sheets, and most analytics tools.
              </p>
            </div>

            <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 16 }}>
              <SectionHeader icon={Shield} title="Your Rights" color="#fbbf24" />
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { t: 'Right to Access',    d: 'Download all your personal data at any time using the export tools above.' },
                  { t: 'Right to Deletion',  d: 'Contact support to permanently delete your account and all associated data.' },
                  { t: 'No Data Selling',    d: 'MindPulse never sells, rents, or trades your personal data to third parties.' },
                  { t: 'Minimal Collection', d: 'We only collect what is strictly necessary to power your wellness insights.' },
                ].map(({ t, d }) => (
                  <div key={t} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', marginBottom: 4, fontFamily: 'Sora,sans-serif' }}>{t}</p>
                    <p style={{ fontSize: 11, color: '#8B949E', lineHeight: 1.6 }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── Logout confirm modal ─────────────────────────────────────────── */}
      {logoutConf && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16, background: 'rgba(6,11,24,0.88)', backdropFilter: 'blur(16px)' }}>
          <div className="glass-md" style={{ borderRadius: 24, padding: '36px 32px', maxWidth: 340, width: '100%', textAlign: 'center', border: '1px solid rgba(248,113,113,0.15)' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogOut size={26} style={{ color: '#f87171' }} />
            </div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>Sign out?</h3>
            <p style={{ color: '#8B949E', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Your progress is safely saved. You can sign back in anytime to continue your wellness journey.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setLogoutConf(false)} className="btn-ghost" style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14 }}>Cancel</button>
              <button onClick={() => { logout(); onNavigate('home'); }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .2s' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
