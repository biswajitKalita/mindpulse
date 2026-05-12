import { useState } from 'react';
import { X, Phone, MessageCircle, Heart, Wind, CheckSquare, AlertTriangle, ChevronRight } from 'lucide-react';
import { useCrisis } from '../context/CrisisContext';
import BreathingExercise from './BreathingExercise';

type Tab = 'support' | 'breathe' | 'ground';

const CRISIS_LINES = [
  { name: 'iCall — Free Counselling',         contact: '9152987821',         sub: 'Mon–Sat 8am–10pm, English & Hindi',          url: 'tel:9152987821',          icon: '🆘' },
  { name: 'Vandrevala Foundation',            contact: '1860-2662-345',      sub: '24/7 free mental health helpline',           url: 'tel:18602662345',         icon: '💬' },
  { name: 'AASRA — Crisis Helpline',          contact: '9820466627',         sub: 'Suicide prevention, 24/7 available',          url: 'tel:9820466627',          icon: '🏥' },
  { name: 'International — Find a Helpline',  contact: 'findahelpline.com',  sub: 'Find crisis lines worldwide',                url: 'https://findahelpline.com', icon: '🌍' },
];

const GROUNDING = [
  { n: '5', sense: 'See',   prompt: 'Name 5 things you can see right now',           emoji: '👁️' },
  { n: '4', sense: 'Touch', prompt: 'Notice 4 things you can physically touch',      emoji: '🤚' },
  { n: '3', sense: 'Hear',  prompt: 'Listen for 3 distinct sounds around you',       emoji: '👂' },
  { n: '2', sense: 'Smell', prompt: 'Find 2 things you can smell (or imagine)',      emoji: '👃' },
  { n: '1', sense: 'Taste', prompt: 'Notice 1 thing you can taste in your mouth',   emoji: '👅' },
];

export default function CrisisAlertModal() {
  const { showModal, closeCrisisModal, crisisLevel, mlScore } = useCrisis();
  const [tab,          setTab]          = useState<Tab>('support');
  const [groundDone,   setGroundDone]   = useState<number[]>([]);
  const [breatheDone,  setBreatheDone]  = useState(false);

  if (!showModal) return null;

  const isCritical = crisisLevel === 'critical';
  const accentColor = isCritical ? '#f87171' : '#fbbf24';
  const accentBg    = isCritical ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)';

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'support',  label: 'Get Support', icon: Phone },
    { id: 'breathe',  label: 'Breathe',     icon: Wind },
    { id: 'ground',   label: '5-4-3-2-1',   icon: Heart },
  ];

  const toggleGround = (i: number) =>
    setGroundDone(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="crisis-overlay-enter"
        onClick={closeCrisisModal}
        style={{ position: 'fixed', inset: 0, background: 'rgba(4,8,18,0.92)', backdropFilter: 'blur(16px)', zIndex: 2000 }}
      />

      {/* Modal */}
      <div
        className="crisis-modal-enter"
        style={{
          position: 'fixed', inset: 0, zIndex: 2001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', pointerEvents: 'none',
        }}
      >
        <div style={{
          width: '100%', maxWidth: 560, maxHeight: '90vh',
          background: 'rgba(10,16,32,0.98)', border: `1px solid ${accentColor}33`,
          borderRadius: 28, overflow: 'hidden', pointerEvents: 'all',
          display: 'flex', flexDirection: 'column',
          boxShadow: `0 0 60px ${accentColor}20, 0 32px 80px rgba(0,0,0,0.6)`,
        }}>

          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            background: isCritical
              ? 'linear-gradient(135deg,rgba(248,113,113,0.12),rgba(239,68,68,0.06))'
              : 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06))',
            borderBottom: `1px solid ${accentColor}20`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className={isCritical ? 'alert-pulse' : ''}
                  style={{ width: 44, height: 44, borderRadius: 13, background: accentBg, border: `1px solid ${accentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={20} style={{ color: accentColor }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 800, color: '#FFFFFF' }}>
                      {isCritical ? 'You Matter — Help Is Here' : 'Take a Moment for Yourself'}
                    </h2>
                  </div>
                  <p style={{ fontSize: 12, color: '#8B949E', marginTop: 3 }}>
                    Risk score <strong style={{ color: accentColor }}>{mlScore}</strong> — {isCritical ? 'Support resources and calming tools below' : 'Elevated stress detected. You\'re not alone'}
                  </p>
                </div>
              </div>
              <button onClick={closeCrisisModal}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#3d444d', flexShrink: 0, display: 'flex', transition: 'all .2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FFFFFF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#3d444d'}>
                <X size={16} />
              </button>
            </div>

            {/* Score display */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[
                { label: 'Your Score', value: mlScore, color: accentColor },
                { label: 'Level',      value: isCritical ? 'Critical' : 'Elevated', color: accentColor },
                { label: 'Status',     value: 'Support active', color: '#00E5FF' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#3d444d', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', padding: '12px 24px 0', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer',
                  background: tab === id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: tab === id ? '#FFFFFF' : '#8B949E',
                  fontSize: 13, fontWeight: tab === id ? 600 : 400,
                  borderBottom: tab === id ? `2px solid ${accentColor}` : '2px solid transparent',
                  transition: 'all .2s', fontFamily: 'DM Sans,sans-serif',
                }}>
                <Icon size={13} /> {label}
                {id === 'breathe' && breatheDone && <span style={{ fontSize: 10, marginLeft: 2 }}>✓</span>}
                {id === 'ground' && groundDone.length === 5 && <span style={{ fontSize: 10, marginLeft: 2 }}>✓</span>}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable */}
          <div className="crisis-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
            <style>{`
              .crisis-scroll-area::-webkit-scrollbar { width: 6px; }
              .crisis-scroll-area::-webkit-scrollbar-track { background: transparent; }
              .crisis-scroll-area::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
              .crisis-scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
              .crisis-resource-card { transition: all 0.2s ease; text-decoration: none; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
              .crisis-resource-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
            `}</style>

            {/* ── SUPPORT TAB ── */}
            {tab === 'support' && (
              <div style={{ animation: 'slideUp 0.3s ease forwards' }}>
                {isCritical && (
                  <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 14, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <p style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600, marginBottom: 4 }}>
                      ⚠ If you are in immediate danger, please call emergency services (112 / 911) now.
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(252,165,165,0.7)', lineHeight: 1.6 }}>
                      MindPulse is a support tool — not a replacement for emergency services or professional care.
                    </p>
                  </div>
                )}

                <p style={{ fontSize: 12, color: '#8B949E', marginBottom: 14 }}>
                  Trained crisis counsellors are available right now — free, confidential, 24/7.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {CRISIS_LINES.map(({ name, contact, sub, url, icon }) => (
                    <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="crisis-resource-card">
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', marginBottom: 2, fontFamily: 'Sora,sans-serif' }}>{name}</p>
                        <p style={{ fontSize: 11, color: '#8B949E' }}>{sub}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: accentColor, fontFamily: 'Sora,sans-serif' }}>{contact}</p>
                      </div>
                    </a>
                  ))}
                </div>

                <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}>
                  <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.7 }}>
                    <span style={{ color: '#00E5FF', fontWeight: 600 }}>Remember:</span> Reaching out is a sign of strength. These counsellors have helped millions of people through their darkest moments. You deserve support.
                  </p>
                </div>

                <button onClick={() => setTab('breathe')}
                  style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', color: '#00E5FF', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Wind size={14} /> Try a calming breathing exercise <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* ── BREATHE TAB ── */}
            {tab === 'breathe' && (
              <div style={{ animation: 'slideUp 0.3s ease forwards' }}>
                <p style={{ fontSize: 12, color: '#8B949E', marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>
                  Box breathing activates your parasympathetic nervous system,<br />reducing anxiety in 3–5 minutes.
                </p>
                <BreathingExercise onComplete={() => setBreatheDone(true)} />
                {breatheDone && (
                  <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#00E5FF', fontWeight: 600 }}>Great job completing the exercise 💚</p>
                    <p style={{ fontSize: 12, color: '#8B949E', marginTop: 4 }}>How are you feeling? Try the grounding exercise next.</p>
                    <button onClick={() => setTab('ground')}
                      style={{ marginTop: 10, padding: '8px 18px', borderRadius: 10, background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)', color: '#00E5FF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Try 5-4-3-2-1 Grounding →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── GROUNDING TAB ── */}
            {tab === 'ground' && (
              <div style={{ animation: 'slideUp 0.3s ease forwards' }}>
                <p style={{ fontSize: 12, color: '#8B949E', marginBottom: 6, lineHeight: 1.6 }}>
                  The <strong style={{ color: '#FFFFFF' }}>5-4-3-2-1 technique</strong> anchors you to the present moment using your five senses. Check off each one as you notice it.
                </p>
                <p style={{ fontSize: 11, color: '#3d444d', marginBottom: 16 }}>{groundDone.length}/5 completed</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {GROUNDING.map(({ n, sense, prompt, emoji }, i) => {
                    const done = groundDone.includes(i);
                    return (
                      <div key={i} className={`ground-card${done ? ' done' : ''}`} onClick={() => toggleGround(i)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: done ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, transition: 'all .25s' }}>
                            {done ? '✓' : emoji}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 700, color: done ? '#00E5FF' : '#FFFFFF' }}>{n} things to {sense}</span>
                            </div>
                            <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.5 }}>{prompt}</p>
                          </div>
                          <CheckSquare size={16} style={{ color: done ? '#00E5FF' : '#3d444d', flexShrink: 0, transition: 'color .25s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {groundDone.length === 5 && (
                  <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', textAlign: 'center', animation: 'slideUp 0.4s ease forwards' }}>
                    <p style={{ fontSize: 15, marginBottom: 6 }}>🌟</p>
                    <p style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color: '#00E5FF', marginBottom: 6 }}>You completed the grounding exercise!</p>
                    <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.6 }}>Take a slow breath. You are present, you are safe, and you are not alone. Consider reaching out to someone you trust or a crisis line.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: '#3d444d', textAlign: 'center', lineHeight: 1.6 }}>
              MindPulse is not a substitute for professional mental health care. In emergencies, call 112 or 911.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
