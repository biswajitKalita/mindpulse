import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Activity, Calendar, Brain, Heart, Zap, ArrowRight, AlertTriangle, Clock, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCrisis } from '../context/CrisisContext';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { RiskTrendChart, EmotionRadarChart } from '../components/Charts';
import AIInsights from '../components/AIInsights';

interface DashboardProps { onNavigate: (page: string) => void; }

// ── Mood score mapping for trend awareness ───────────────────────────
const MOOD_SCORE: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, struggling: 1 };

// ── 7-day calendar dot grid (GitHub-style streak) ────────────────────
function WeekDots({ entries }: { entries: { date: string }[] }) {
  const DAYS = ['S','M','T','W','T','F','S'];
  const today = new Date();
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const has = entries.some(e => e.date.slice(0, 10) === iso);
    const isToday = i === 6;
    return { label: DAYS[d.getDay()], has, isToday };
  });

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {dots.map(({ label, has, isToday }, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: has ? 'rgba(0,229,255,0.85)' : 'rgba(255,255,255,0.05)',
            border: isToday ? '2px solid rgba(0,229,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: has ? '0 0 8px rgba(0,229,255,0.5)' : 'none',
            transition: 'all 0.3s',
          }}>
            {has && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#060b18' }} />}
          </div>
          <span style={{ fontSize: 9, color: isToday ? '#00E5FF' : '#3d444d' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Score delta badge ─────────────────────────────────────────────────
function ScoreDelta({ delta, hasEntries }: { delta: number; hasEntries: boolean }) {
  if (!hasEntries || delta === 0) return null;
  const up  = delta > 0;
  const col = up ? '#34d399' : '#f87171';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: up ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${up ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
      <Icon size={11} style={{ color: col }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{up ? '+' : ''}{delta} pts vs last</span>
    </div>
  );
}

// ── Today vs Average bar ──────────────────────────────────────────────
function ScoreVsAvg({ latest, avg, color }: { latest: number; avg: number; color: string }) {
  const max = Math.max(latest, avg, 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#8B949E', width: 60, flexShrink: 0 }}>Today</span>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${(latest / 100) * 100}%`, height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 6px ${color}66`, transition: 'width 1s ease' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, width: 28, textAlign: 'right' }}>{latest}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#8B949E', width: 60, flexShrink: 0 }}>7-day avg</span>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${(avg / 100) * 100}%`, height: '100%', borderRadius: 99, background: 'rgba(168,139,250,0.7)', transition: 'width 1s ease' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', width: 28, textAlign: 'right' }}>{avg}</span>
      </div>
    </div>
  );
}

// ── Last check-in recency ─────────────────────────────────────────────
function lastCheckinLabel(entries: { date: string }[]) {
  if (!entries.length) return null;
  const ms = Date.now() - new Date(entries[0].date).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 2)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// ── Contextual Daily Action card ──────────────────────────────────────
const ACTION_MAP: Record<string, { emoji: string; title: string; tip: string; action: string }> = {
  anxiety:  { emoji: '🫁', title: 'Anxiety detected',    tip: 'Try the 5-4-3-2-1 grounding technique to anchor yourself to the present moment.', action: 'Open Grounding' },
  sadness:  { emoji: '🫶', title: 'Low mood detected',   tip: 'A short gratitude journaling exercise (3 things) is proven to shift emotional state.', action: 'Try Journaling' },
  anger:    { emoji: '💨', title: 'Tension detected',    tip: 'Box breathing (4-4-4-4) activates your nervous system\'s calm response in 3–5 min.', action: 'Open Breathing' },
  joy:      { emoji: '✨', title: 'Positive energy!',    tip: 'Great day to set a small intention or reach out to someone you care about.', action: 'Keep it up' },
  default:  { emoji: '🧘', title: 'Check in with yourself', tip: 'A 2-minute mindfulness scan can help you tune into how you\'re really feeling today.', action: 'Start Mindfulness' },
};

// ── Time-aware greeting ──────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { state, loading, riskLevel, latestScore, scoreDelta, avgRiskScore, weeklyScores, streakDays } = useApp();
  const { crisisLevel, openCrisisModal } = useCrisis();
  const { entries, user } = state;
  const hasEntries = entries.length > 0;

  if (loading) return <DashboardSkeleton />;

  // ── Risk display config — corrected for new ML scoring ──────────────
  const riskConfig = {
    low:      { color: '#34d399', label: 'Feeling Good',    sub: "You're in a healthy place. Keep nurturing your habits.",            bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.2)' },
    moderate: { color: '#fbbf24', label: 'Mild Stress',     sub: "Some stress patterns detected. Check out our calming resources.",   bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.2)' },
    high:     { color: '#f87171', label: 'High Distress',   sub: "Significant distress detected. You are not alone — seek support.", bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.2)' },
  }[hasEntries ? riskLevel : 'low'];

  const [animScore, setAnimScore] = useState(0);
  useEffect(() => {
    if (!hasEntries) return;
    const target = latestScore;
    let start = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      start = Math.min(start + step, target);
      setAnimScore(start);
      if (start >= target) clearInterval(t);
    }, 28);
    return () => clearInterval(t);
  }, [latestScore, hasEntries]);

  const circumference = 2 * Math.PI * 72;
  const strokeDash = (latestScore / 100) * circumference;

  // Emotion analysis from last 5 entries
  const emotionMap: Record<string, number> = {};
  entries.slice(0, 5).forEach(e => e.emotions.forEach(em => { emotionMap[em] = (emotionMap[em] || 0) + 1; }));
  const topEmotions = Object.entries(emotionMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxEmo = topEmotions[0]?.[1] || 1;
  const emoColors = ['#00E5FF', '#fbbf24', '#a78bfa', '#f472b6'];

  const thisWeekEntries = entries.filter(e => (Date.now() - new Date(e.date).getTime()) < 7 * 86400000);
  const lastLabel = lastCheckinLabel(entries);
  const topEmoKey = topEmotions[0]?.[0] ?? 'default';
  const dailyAction = ACTION_MAP[topEmoKey] ?? ACTION_MAP.default;

  const stats = [
    { label: 'This Week',     value: String(thisWeekEntries.length), icon: Calendar,  up: thisWeekEntries.length > 2,    change: thisWeekEntries.length > 0 ? `${thisWeekEntries.length} sessions` : 'No entries' },
    { label: 'Avg Wellness',  value: hasEntries ? String(avgRiskScore) : '—', icon: Heart, up: avgRiskScore >= 55, change: avgRiskScore >= 70 ? '🟢 Good' : avgRiskScore >= 45 ? '🟡 Moderate' : '🔴 At risk' },
    { label: 'Streak',        value: streakDays > 0 ? `${streakDays}d 🔥` : '0d',    icon: Activity, up: streakDays > 2,          change: streakDays > 0 ? 'Keep going!' : 'Start today' },
    { label: 'Total Entries', value: String(entries.length),                           icon: Brain,    up: true,                 change: 'All time' },
  ];

  return (
    <div className="min-h-screen grid-bg page-enter page-px" style={{ paddingTop: 100, paddingBottom: 48 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            {/* Label */}
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg,#00E5FF,#a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 8,
            }}>Your Wellness Intelligence</p>

            {/* Title with gradient on name */}
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              {user ? (
                <>
                  <span style={{ color: '#8B949E', fontWeight: 400 }}>{getGreeting()}, </span>
                  <span style={{ background: 'linear-gradient(135deg,#00E5FF,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {user.name.split(' ')[0]}
                  </span>
                  <span style={{ WebkitTextFillColor: 'initial', color: '#FFFFFF' }}>.</span>
                </>
              ) : (
                <span style={{ background: 'linear-gradient(135deg,#00E5FF,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Wellness Intelligence</span>
              )}
            </h1>

            {/* Subtitle row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ color: '#8B949E', fontSize: 13, lineHeight: 1.6 }}>
                {hasEntries
                  ? <><strong style={{ color: '#FFFFFF', fontWeight: 600 }}>{entries.length}</strong> session{entries.length !== 1 ? 's' : ''} logged · <strong style={{ color: '#00E5FF', fontWeight: 600 }}>{streakDays}‑day</strong> streak active
                  </>
                  : 'Your mental wellness journey begins with a single check‑in.'}
              </p>
              {lastLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Clock size={10} style={{ color: '#8B949E' }} />
                  <span style={{ fontSize: 11, color: '#8B949E' }}>Last: {lastLabel}</span>
                </div>
              )}
            </div>
          </div>
          {hasEntries && <ScoreDelta delta={scoreDelta} hasEntries={hasEntries} />}
        </div>
        <div className="grid-2-1" style={{ marginBottom: 16 }}>

          {/* Score card */}
          <div className="glass" style={{ borderRadius: 24, padding: 'clamp(18px,3vw,28px)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 3 }}>Wellness Score</h2>
                <p style={{ fontSize: 12, color: '#8B949E' }}>Higher score = better wellbeing · 0–100</p>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: riskConfig.bg, color: riskConfig.color, border: `1px solid ${riskConfig.border}`, flexShrink: 0 }}>
                {hasEntries ? riskConfig.label : 'No data yet'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {/* ── Premium Gauge Ring ── */}
              <div style={{ position: 'relative', flexShrink: 0, width: 170, height: 170 }}>
                {/* Outer ambient glow halo */}
                {hasEntries && (
                  <div style={{
                    position: 'absolute', inset: -10,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${riskConfig.color}18 0%, transparent 70%)`,
                    filter: 'blur(12px)',
                    animation: 'pulse 3s ease-in-out infinite',
                  }} />
                )}

                <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
                  <defs>
                    {/* Arc gradient — color to lighter shade */}
                    <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor={riskConfig.color} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={riskConfig.color} stopOpacity="1" />
                    </linearGradient>
                    {/* Inner frosted disc */}
                    <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%"   stopColor="rgba(255,255,255,0.04)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
                    </radialGradient>
                    {/* Glow filter for arc */}
                    <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Frosted inner disc */}
                  <circle cx="85" cy="85" r="62" fill="url(#discGrad)" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                  {/* 24 tick marks around the ring */}
                  {Array.from({ length: 24 }, (_, i) => {
                    const angle = (i / 24) * 360;
                    const rad   = (angle - 90) * Math.PI / 180;
                    const isMajor = i % 6 === 0;
                    const r1 = isMajor ? 73 : 75;
                    const r2 = 80;
                    return (
                      <line key={i}
                        x1={85 + r1 * Math.cos(rad)} y1={85 + r1 * Math.sin(rad)}
                        x2={85 + r2 * Math.cos(rad)} y2={85 + r2 * Math.sin(rad)}
                        stroke={isMajor ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}
                        strokeWidth={isMajor ? 1.5 : 1}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* Track ring */}
                  <circle cx="85" cy="85" r="68" stroke="rgba(255,255,255,0.05)" strokeWidth="9" fill="none" strokeLinecap="round" />

                  {/* Filled glow arc (blur layer) */}
                  {hasEntries && (
                    <circle cx="85" cy="85" r="68"
                      stroke={riskConfig.color}
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${strokeDash} ${circumference}`}
                      opacity={0.25}
                      filter="url(#arcGlow)"
                      style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)' }}
                    />
                  )}

                  {/* Main filled arc */}
                  <circle cx="85" cy="85" r="68"
                    stroke={hasEntries ? 'url(#arcGrad)' : 'rgba(255,255,255,0.04)'}
                    strokeWidth="9"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={hasEntries ? `${strokeDash} ${circumference}` : `0 ${circumference}`}
                    style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)' }}
                  />

                  {/* Glowing tip dot on arc end */}
                  {hasEntries && latestScore > 2 && (() => {
                    const angle = ((latestScore / 100) * 360 - 90) * Math.PI / 180;
                    const tx = 85 + 68 * Math.cos(angle);
                    const ty = 85 + 68 * Math.sin(angle);
                    return (
                      <>
                        <circle cx={tx} cy={ty} r="7" fill={riskConfig.color} opacity="0.3" />
                        <circle cx={tx} cy={ty} r="4.5" fill={riskConfig.color} style={{ filter: `drop-shadow(0 0 6px ${riskConfig.color})` }} />
                      </>
                    );
                  })()}
                </svg>

                {/* Center label — absolute on top of SVG */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', zIndex: 2,
                  transform: 'rotate(0deg)', // cancel the SVG rotate
                }}>
                  {hasEntries ? (
                    <>
                      <span style={{
                        fontFamily: 'Sora,sans-serif', fontSize: 42, fontWeight: 900,
                        color: '#FFFFFF', lineHeight: 1,
                        textShadow: `0 0 24px ${riskConfig.color}55`,
                      }}>{animScore}</span>
                      <span style={{ fontSize: 10, color: '#8B949E', marginTop: 2, letterSpacing: '0.08em' }}>/ 100</span>
                      <span style={{
                        marginTop: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: riskConfig.color,
                        padding: '2px 8px', borderRadius: 99,
                        background: riskConfig.bg, border: `1px solid ${riskConfig.border}`,
                      }}>{riskConfig.label}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 900, color: '#3d444d', lineHeight: 1 }}>—</span>
                      <span style={{ fontSize: 10, color: '#3d444d', marginTop: 4 }}>No data</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Risk level badge */}
                <div style={{ borderRadius: 14, padding: '12px 14px', background: riskConfig.bg, border: `1px solid ${riskConfig.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <Zap size={13} style={{ color: riskConfig.color }} />
                    <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, fontWeight: 600, color: riskConfig.color }}>{hasEntries ? riskConfig.label : 'Complete a check-in'}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.5 }}>{hasEntries ? riskConfig.sub : 'Your wellness score appears after your first entry.'}</p>
                </div>

                {/* Score vs avg bars */}
                {hasEntries && <ScoreVsAvg latest={latestScore} avg={avgRiskScore} color={riskConfig.color} />}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onNavigate('checkin')} className="btn-primary" style={{ flex: 1, padding: '9px', borderRadius: 11, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>New Check-In</button>
                  <button onClick={() => onNavigate('resources')} className="btn-ghost" style={{ flex: 1, padding: '9px', borderRadius: 11, fontSize: 12 }}>Resources</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Detected Emotions */}
            <div className="glass" style={{ borderRadius: 20, padding: 20, flex: 1 }}>
              <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600, color: '#FFFFFF', marginBottom: 14 }}>Detected Emotions</h3>
              {topEmotions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topEmotions.map(([name, count], i) => (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#8B949E', textTransform: 'capitalize' }}>{name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: emoColors[i] }}>{Math.round((count / maxEmo) * 100)}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ width: `${(count / maxEmo) * 100}%`, height: '100%', borderRadius: 99, background: emoColors[i], boxShadow: `0 0 6px ${emoColors[i]}88`, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#3d444d', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>Emotions appear after check-ins</p>
              )}
            </div>

            {/* Crisis / support */}
            <div style={{ borderRadius: 20, padding: '18px', textAlign: 'center', background: crisisLevel !== 'none' ? 'rgba(248,113,113,0.08)' : 'linear-gradient(135deg,rgba(0,229,255,0.12),rgba(0,229,255,0.12))', border: crisisLevel !== 'none' ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(0,229,255,0.15)' }}>
              {crisisLevel !== 'none' && (
                <div className="alert-pulse" style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <AlertTriangle size={16} style={{ color: '#f87171' }} />
                </div>
              )}
              <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600, color: crisisLevel !== 'none' ? '#fca5a5' : '#FFFFFF', marginBottom: 5 }}>
                {crisisLevel !== 'none' ? 'Support Available' : 'Need Help Now?'}
              </h3>
              <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 10 }}>
                {crisisLevel !== 'none' ? 'Crisis tools & breathing exercises' : '24/7 immediate support'}
              </p>
              <button onClick={crisisLevel !== 'none' ? openCrisisModal : () => onNavigate('resources')}
                style={{ width: '100%', padding: '9px', borderRadius: 11, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: crisisLevel !== 'none' ? 'rgba(248,113,113,0.15)' : 'linear-gradient(135deg,#00E5FF,#00B4D8)', border: crisisLevel !== 'none' ? '1px solid rgba(248,113,113,0.3)' : 'none', color: crisisLevel !== 'none' ? '#fca5a5' : '#060b18', fontFamily: 'Sora,sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
                {crisisLevel !== 'none' ? 'Open Support Center' : 'Crisis Resources'}
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid-4-cols" style={{ marginBottom: 16 }}>
          {stats.map(({ label, value, icon: Icon, up, change }) => (
            <div key={label} className="glass card-lift" style={{ borderRadius: 18, padding: '16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} style={{ color: '#00E5FF' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: up ? '#34d399' : '#f87171' }}>
                  {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                </div>
              </div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 11, color: '#8B949E', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 10, color: up ? '#34d399' : '#f87171', fontWeight: 600 }}>{change}</div>
            </div>
          ))}
        </div>

        {/* ── Streak calendar + Daily Action row ── */}
        {hasEntries && (
          <div className="grid-2-1" style={{ marginBottom: 16 }}>
            {/* 7-day streak calendar */}
            <div className="glass" style={{ borderRadius: 20, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>This Week's Activity</h3>
                  <p style={{ fontSize: 11, color: '#8B949E' }}>{streakDays}-day streak · stay consistent</p>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', fontSize: 11, fontWeight: 700, color: '#00E5FF' }}>
                  {thisWeekEntries.length}/7 days
                </div>
              </div>
              <WeekDots entries={entries} />
            </div>

            {/* Daily Action */}
            <div className="glass" style={{ borderRadius: 20, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{dailyAction.emoji}</span>
                <div>
                  <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>Today's Action</h3>
                  <p style={{ fontSize: 11, color: '#8B949E' }}>{dailyAction.title}</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.6, marginBottom: 12 }}>{dailyAction.tip}</p>
              <button onClick={() => onNavigate('resources')} style={{ width: '100%', padding: '8px', borderRadius: 10, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', color: '#00E5FF', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Target size={12} /> {dailyAction.action}
              </button>
            </div>
          </div>
        )}

        {/* ── AI Insights ── */}
        {hasEntries && (
          <AIInsights
            entries={entries}
            riskLevel={riskLevel}
            avgRiskScore={avgRiskScore}
            streakDays={streakDays}
          />
        )}

        {/* ── Charts row ── */}
        <div className="grid-2-1" style={{ marginBottom: 16 }}>
          {/* Weekly trend */}
          <div className="glass" style={{ borderRadius: 24, padding: 'clamp(16px,3vw,28px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>Weekly Wellness Trend</h2>
                {/* FIXED: was "Lower scores = better" — now correct */}
                <p style={{ fontSize: 11, color: '#8B949E' }}>Higher score = better well-being · 0–100</p>
              </div>
            </div>
            {hasEntries ? (
              <RiskTrendChart data={weeklyScores} height={200} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#3d444d', fontSize: 12 }}>Chart fills as you add check-ins</p>
              </div>
            )}
          </div>

          {/* Emotion radar */}
          <div className="glass" style={{ borderRadius: 24, padding: 'clamp(16px,3vw,28px)' }}>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>Emotion Profile</h2>
            <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 8 }}>Detected from your journal entries</p>
            {topEmotions.length >= 3 ? (
              <EmotionRadarChart
                data={topEmotions.map(([name, count]) => ({ emotion: name, value: Math.round((count / maxEmo) * 100) }))}
                height={200}
              />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#3d444d', fontSize: 12, textAlign: 'center' }}>More check-ins needed<br />to build your emotion profile</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
