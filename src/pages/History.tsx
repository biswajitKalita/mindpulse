import { useState } from 'react';
import { TrendingDown, TrendingUp, Search, SlidersHorizontal, Plus, Activity, Calendar, Award, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HistorySkeleton } from '../components/SkeletonLoaders';

interface HistoryProps { onNavigate: (page: string) => void; }

// ── Extended mood config (matches new app logic) ─────────────────────────
const MOOD_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; emoji: string }> = {
  great:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',  label: 'Great',       emoji: '✨' },
  good:       { color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',    border: 'rgba(0,229,255,0.25)',   label: 'Good',        emoji: '😊' },
  okay:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)', label: 'Okay',        emoji: '⚖️' },
  low:        { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',  label: 'Low',         emoji: '☁️' },
  struggling: { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)', label: 'Struggling',  emoji: '🌧️' },
  default:    { color: '#8B949E', bg: 'rgba(139,148,158,0.1)',  border: 'rgba(139,148,158,0.25)', label: 'Unknown',     emoji: '📝' },
};

export default function History({ onNavigate }: HistoryProps) {
  const { state, loading, avgRiskScore, streakDays } = useApp();
  const { entries } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <HistorySkeleton />;

  const filtered = entries.filter(e => {
    const matchText = e.journalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.emotions.some(em => em.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchMood = filterMood === 'all' || e.mood === filterMood;
    return matchText && matchMood;
  });

  // Risk display helper for new high=good logic
  const getRiskDisplay = (score: number) => {
    if (score >= 70) return { label: 'Feeling Good', color: '#34d399' };
    if (score >= 45) return { label: 'Mild Stress',  color: '#fbbf24' };
    return { label: 'At Risk', color: '#f87171' };
  };
  const avgRisk = getRiskDisplay(avgRiskScore);

  return (
    <div className="min-h-screen grid-bg page-enter px-4" style={{ paddingTop: 100, paddingBottom: 48 }}>
      <div className="max-w-4xl mx-auto">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'linear-gradient(90deg,#00E5FF,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Your Journey
          </p>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Check-In History
          </h1>
          <p style={{ marginTop: 8, color: '#8B949E', fontSize: 13, lineHeight: 1.6 }}>
            Review your emotional patterns and track your wellness over time.
          </p>
        </div>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Sessions',  value: entries.length,                               icon: Calendar, color: '#00E5FF' },
            { label: 'Avg Wellness',    value: entries.length ? avgRiskScore : '—',          icon: Activity, color: avgRisk.color },
            { label: 'Current Streak',  value: streakDays > 0 ? `${streakDays}d 🔥` : '0d',icon: Award,    color: '#a78bfa' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass card-lift" style={{ borderRadius: 20, padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, marginBottom: 4 }}>
                  {value}
                </div>
                <div style={{ fontSize: 11, color: '#8B949E' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search & Filters ──────────────────────────────────────────────── */}
        <div className="glass" style={{ borderRadius: 20, padding: '16px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8B949E' }} />
              <input type="text" placeholder="Search insights, emotions, or tags…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="input-dark" style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 14, fontSize: 13, fontFamily: 'Sora,sans-serif', transition: 'border-color 0.2s' }} />
            </div>
            <div style={{ position: 'relative', width: 'auto' }}>
              <SlidersHorizontal size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8B949E', pointerEvents: 'none' }} />
              <select value={filterMood} onChange={e => setFilterMood(e.target.value)}
                className="input-dark" style={{ paddingLeft: 40, paddingRight: 20, paddingTop: 12, paddingBottom: 12, borderRadius: 14, fontSize: 13, appearance: 'none', minWidth: 150, fontFamily: 'Sora,sans-serif', cursor: 'pointer' }}>
                <option value="all">All Moods</option>
                {Object.entries(MOOD_CONFIG).filter(([k]) => k !== 'default').map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        {entries.length === 0 ? (
          /* Empty state - brand new */
          <div style={{ borderRadius: 24, padding: '50px 30px', textAlign: 'center', background: 'linear-gradient(135deg,rgba(0,229,255,0.05),rgba(167,139,250,0.05))', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.2))' }}>📓</div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Your story starts here</h3>
            <p style={{ color: '#8B949E', fontSize: 13, marginBottom: 24, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>
              Your check-in history, mood trends, and AI insights will appear on this page.
            </p>
            <button onClick={() => onNavigate('checkin')} className="btn-primary"
              style={{ padding: '12px 28px', borderRadius: 14, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'Sora,sans-serif', fontWeight: 700 }}>
              <Plus size={16} /> Begin First Check-In
            </button>
          </div>

        ) : filtered.length === 0 ? (
          /* Empty state - search yielded no results */
          <div style={{ borderRadius: 24, padding: '40px 30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.7 }}>🔍</div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>No matches found</h3>
            <p style={{ color: '#8B949E', fontSize: 13, marginBottom: 18 }}>Try adjusting your search terms or mood filters.</p>
            <button onClick={() => { setSearchTerm(''); setFilterMood('all'); }} className="btn-ghost"
              style={{ padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>Clear all filters</button>
          </div>

        ) : (
          /* Timeline */
          <div style={{ position: 'relative', paddingLeft: 12 }}>
            {/* Vertical timeline line */}
            <div style={{ position: 'absolute', top: 30, bottom: 20, left: 24, width: 2, background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {filtered.map((entry, idx) => {
                const cfg = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.default;
                const prev = entries[idx + 1];
                // New logic: Higher score = better wellness.
                const improved = prev ? entry.riskScore > prev.riskScore : null;
                const date = new Date(entry.date);
                const rDisplay = getRiskDisplay(entry.riskScore);

                return (
                  <div key={entry.id} style={{ position: 'relative', display: 'flex', gap: 20 }}>
                    {/* Timeline dot */}
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#060b18', border: `3px solid ${cfg.color}`, position: 'relative', zIndex: 2, flexShrink: 0, marginTop: 24, boxShadow: `0 0 10px ${cfg.color}50` }} />

                    {/* Entry Card */}
                    <div className="glass card-lift" style={{ flex: 1, borderRadius: 24, padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            {cfg.emoji}
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>
                              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Wellness Score Badge */}
                        <div style={{ textAlign: 'right', flexShrink: 0, background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: 10, color: '#8B949E', display: 'block', marginBottom: 2 }}>Wellness Score</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color: rDisplay.color }}>
                              {entry.riskScore}
                            </span>
                            {improved !== null && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: 6, background: improved ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: improved ? '#34d399' : '#f87171' }}>
                                {improved ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Entry Text */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 14, marginBottom: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.7 }}>
                          "{entry.journalText}"
                        </p>
                      </div>

                      {/* Tags & Metrics */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        {/* Metrics */}
                        {(entry.stressLevel > 0 || entry.sleepQuality > 0) && (
                          <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
                            {entry.stressLevel > 0 && <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: '#8B949E' }}>Stress: {entry.stressLevel}/10</span>}
                            {entry.sleepQuality > 0 && <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: '#8B949E' }}>Sleep: {entry.sleepQuality}/10</span>}
                          </div>
                        )}
                        {/* Dominant Emotion */}
                        {entry.dominantEmotion && entry.dominantEmotion !== 'neutral' && (
                          <span style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,180,255,0.15))', border: '1px solid rgba(0,229,255,0.25)', color: '#00E5FF', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles size={8} /> {entry.dominantEmotion}
                          </span>
                        )}
                        {/* Emotions */}
                        {entry.emotions.filter(em => em.toLowerCase() !== entry.dominantEmotion?.toLowerCase()).map(em => (
                          <span key={em} style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.08)', color: '#a78bfa', fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 99, textTransform: 'capitalize' }}>
                            {em}
                          </span>
                        ))}
                        {/* Activities */}
                        {entry.tags.map(t => (
                          <span key={t} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B949E', fontSize: 10, padding: '4px 10px', borderRadius: 99 }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* AI Insights & Suggestions (Expandable) */}
                      {entry.insights && (
                        <div style={{ marginTop: 16 }}>
                          <button 
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#a78bfa', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
                            <Sparkles size={12} /> AI Analysis {expandedId === entry.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          
                          {expandedId === entry.id && (
                            <div style={{ marginTop: 12, padding: 18, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 16, animation: 'fadeIn .3s ease' }}>
                              <p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.6, marginBottom: 14 }}>{entry.insights}</p>
                              {entry.suggestions && entry.suggestions.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions</span>
                                  {entry.suggestions.map((sug, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#a78bfa', background: 'rgba(0,0,0,0.15)', padding: 10, borderRadius: 8 }}>
                                      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{sug}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer CTA ─────────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div style={{ marginTop: 40, borderRadius: 24, padding: '28px 32px', textAlign: 'center', background: 'linear-gradient(135deg,rgba(52,211,153,0.08),rgba(0,229,255,0.08))', border: '1px solid rgba(52,211,153,0.15)' }}>
            <p style={{ color: '#8B949E', fontSize: 13, marginBottom: 16 }}>
              You're building momentum. Add today's details to keep tracking your journey.
            </p>
            <button onClick={() => onNavigate('checkin')} className="btn-primary"
              style={{ padding: '12px 32px', borderRadius: 14, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'Sora,sans-serif', fontWeight: 700 }}>
              <Plus size={15} /> Add Today's Check-In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
