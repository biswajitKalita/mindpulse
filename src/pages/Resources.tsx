import { Book, Music, Dumbbell, Coffee, Sun, Moon, Wind, ExternalLink, AlertCircle, Heart } from 'lucide-react';
import { useCrisis } from '../context/CrisisContext';
import BreathingExercise from '../components/BreathingExercise';
import { useState, useEffect, useRef } from 'react';
import stressImg from '../assets/meditation/stress_relief.png';
import groundingImg from '../assets/meditation/anxiety_grounding.png';
import depressionImg from '../assets/meditation/depression_support.png';

interface ResourcesProps { onNavigate: (page: string) => void; }

export default function Resources({ onNavigate }: ResourcesProps) {
  const { openCrisisModal } = useCrisis();
  const [showBreathing, setShowBreathing] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [showAllCrisis, setShowAllCrisis] = useState(false);
  const [crisisIdx, setCrisisIdx] = useState(0);
  const crisisTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // India-specific crisis helplines
  const crisis = [
    { name: 'Tele-MANAS',            contact: '14416',            sub: 'Govt. mental health support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'KIRAN',                  contact: '1800-599-0019',    sub: 'Govt. rehabilitation + crisis', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Jeevan Aastha',         contact: '1800-233-3330',    sub: 'Suicide prevention', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Mpower Minds',          contact: '1800-120-820050',  sub: 'Counseling (non-emergency)', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'iCall (TISS)',           contact: '9152987821',       sub: 'Mon\u2013Sat 8am\u201310pm \u00B7 Free counseling', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Vandrevala Foundation',  contact: '1860-2662-345',    sub: '24/7 \u00B7 Hindi & English support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'AASRA',                  contact: '9820466627',       sub: '24/7 \u00B7 Suicide prevention helpline', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'NIMHANS',                contact: '080-46110007',     sub: 'National mental health institute', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Snehi',                  contact: '044-24640050',     sub: 'Emotional support helpline', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'iCall Student Line',     contact: '022-25521111',     sub: 'Specifically for students', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Voice That Cares',       contact: '8448-8448-45',     sub: 'Govt-supported psychosocial helpline', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Connecting Trust',       contact: '+91 9922004305',   sub: 'NGO, crisis intervention', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Muktaa Helpline',        contact: '788-788-9882',     sub: 'Mental health support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Prana Lifeline',         contact: '1800-121-2023040', sub: 'Suicide prevention + crisis support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Lifeline Foundation',    contact: '+91 9088030303',   sub: 'NGO, psychosocial support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'One Life',               contact: '78930-78930',      sub: 'Suicide prevention + emotional support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Fortis Stress Helpline', contact: '+91 8376804102',   sub: 'Hospital-based counseling', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Parivarthan Counselling',contact: '+91 7676602602',   sub: 'NGO, emotional support', flag: '\u{1F1EE}\u{1F1F3}' },
    { name: 'Sanjivini Society',      contact: '011-24311918',     sub: 'Mental health counseling', flag: '\u{1F1EE}\u{1F1F3}' },
  ];

  // Auto-cycle helplines every 3s when not expanded
  useEffect(() => {
    if (showAllCrisis) { if (crisisTimer.current) clearInterval(crisisTimer.current); return; }
    crisisTimer.current = setInterval(() => setCrisisIdx(i => (i + 1) % crisis.length), 3000);
    return () => { if (crisisTimer.current) clearInterval(crisisTimer.current); };
  }, [showAllCrisis, crisis.length]);

  const activities = [
    { title: 'Breathing Exercises',  desc: 'Simple 4-7-8 and box breathing to calm the nervous system and reduce cortisol instantly.', icon: Wind,     color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',    duration: '5 min',  action: () => setShowBreathing(true) },
    { title: 'Guided Meditation',    desc: 'Mindfulness practices for mental clarity, emotional regulation, and inner calm.', icon: Sun,      color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  duration: '10 min', action: () => setShowMeditation(true), label: 'Learn More' },
    { title: 'Physical Exercise',    desc: 'Even 20 minutes of movement boosts endorphins and dramatically improves mood.', icon: Dumbbell, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',   duration: '20 min', action: null },
    { title: 'Sleep Hygiene',        desc: 'Evidence-based tips for restorative, high-quality sleep that protects mental health.', icon: Moon,     color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', duration: '8 hrs',  action: null },
    { title: 'Music Therapy',        desc: 'Curated calming playlists and sound healing validated by neuroscience research.', icon: Music,    color: '#f472b6', bg: 'rgba(244,114,182,0.1)',duration: '20 min', action: null },
    { title: 'Social Connection',    desc: 'Reaching out to loved ones is one of the most powerful mental health healers.', icon: Coffee,   color: '#fb923c', bg: 'rgba(251,146,60,0.1)', duration: '30 min', action: null },
  ];

  const articles = [
    { title: 'Understanding Anxiety: Causes and Coping Strategies',   cat: 'Mental Health',     time: '8 min',  url: 'https://www.nimh.nih.gov/health/topics/anxiety-disorders' },
    { title: 'Building Resilience in Challenging Times',               cat: 'Self-Care',         time: '6 min',  url: 'https://www.apa.org/topics/resilience' },
    { title: 'The Science of Happiness: Evidence-Based Practices',     cat: 'Wellness',          time: '10 min', url: 'https://greatergood.berkeley.edu/science' },
    { title: 'Managing Exam Stress & Academic Pressure',               cat: 'Student Wellness',  time: '7 min',  url: 'https://www.mind.org.uk/information-support/tips-for-everyday-living/student-life/student-life/' },
  ];

  return (
    <div className="min-h-screen grid-bg page-enter px-4" style={{ paddingTop: 100, paddingBottom: 40 }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <p style={{ color: '#00E5FF', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', fontFamily: 'Sora,sans-serif', textTransform: 'uppercase', marginBottom: 12 }}>
            RESOURCES & SUPPORT
          </p>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 14, letterSpacing: '-0.02em' }}>
            You're Not Alone
          </h1>
          <p style={{ color: '#8B949E', maxWidth: 480, margin: '0 auto', fontSize: 14, lineHeight: 1.6 }}>
            Tools, guidance, and professional support to help you thrive. India-specific helplines available 24/7.
          </p>
        </div>

        {/* Crisis Helplines — Compact Carousel */}
        <div style={{
          borderRadius: 24, padding: '24px 28px', marginBottom: 40,
          background: 'linear-gradient(145deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))',
          border: '1px solid rgba(239,68,68,0.15)',
          boxShadow: '0 0 40px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
          position: 'relative', overflow: 'hidden',
          transition: 'all .4s ease',
        }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.12), transparent 70%)', pointerEvents: 'none', animation: 'crisisPulseGlow 3s ease-in-out infinite' }} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: showAllCrisis ? 20 : 16, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              animation: 'crisisPulseGlow 2.5s ease-in-out infinite',
            }}>
              <AlertCircle size={20} style={{ color: '#f87171' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fca5a5', fontFamily: 'Sora,sans-serif', marginBottom: 2, letterSpacing: '-0.01em' }}>
                {'\u{1F1EE}\u{1F1F3}'} Crisis Support {'\u2014'} India
              </h2>
              <p style={{ fontSize: 11.5, color: 'rgba(252,165,165,0.55)' }}>
                Free, confidential helplines {'\u00B7'} <span style={{ color: '#f87171', fontWeight: 700 }}>{crisis.length}</span> numbers
              </p>
            </div>

          </div>

          {/* Cycling single helpline (when collapsed) */}
          {!showAllCrisis && (() => {
            const c = crisis[crisisIdx];
            return (
              <div key={crisisIdx} style={{
                borderRadius: 16, padding: '20px 22px',
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                animation: 'crisisSlideIn .45s cubic-bezier(.4,0,.2,1)',
                marginBottom: 14,
                position: 'relative', zIndex: 1,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 15 }}>{c.flag}</span>
                    <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, color: '#fca5a5', letterSpacing: '-0.01em' }}>{c.name}</h3>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(252,165,165,0.5)', lineHeight: 1.4 }}>{c.sub}</p>
                </div>
                <a href={`tel:${c.contact.replace(/[^0-9+]/g, '')}`}
                  style={{
                    fontSize: '1.1rem', fontWeight: 800, color: '#f87171', fontFamily: 'Sora,sans-serif',
                    textDecoration: 'none', whiteSpace: 'nowrap',
                    padding: '8px 16px', borderRadius: 12,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(239,68,68,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  {'\u{1F4DE}'} {c.contact}
                </a>
              </div>
            );
          })()}

          {/* Dot indicators + progress bar (when collapsed) */}
          {!showAllCrisis && (
            <div style={{ marginBottom: 14, position: 'relative', zIndex: 1 }}>

              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                {crisis.map((_, i) => (
                  <button key={i} type="button" onClick={() => setCrisisIdx(i)}
                    style={{
                      width: i === crisisIdx ? 20 : 6, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: i === crisisIdx ? 'linear-gradient(90deg, #f87171, #fca5a5)' : 'rgba(252,165,165,0.15)',
                      boxShadow: i === crisisIdx ? '0 0 8px rgba(248,113,113,0.4)' : 'none',
                      transition: 'all .35s cubic-bezier(.4,0,.2,1)',
                    }} />
                ))}
              </div>

            </div>
          )}

          {/* Expanded grid (all numbers) */}
          {showAllCrisis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14, position: 'relative', zIndex: 1 }}>
              {crisis.map(({ name, contact, sub, flag }, idx) => (
                <div key={name} style={{
                  borderRadius: 14, padding: '14px 16px',
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.1)',
                  animation: `crisisGridIn .4s cubic-bezier(.4,0,.2,1) ${idx * 40}ms both`,
                  transition: 'all .25s ease',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{flag}</span>
                    <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 11.5, color: '#fca5a5' }}>{name}</h3>
                  </div>
                  <a href={`tel:${contact.replace(/[^0-9+]/g, '')}`}
                    style={{ display: 'block', fontSize: '1rem', fontWeight: 800, color: '#f87171', fontFamily: 'Sora,sans-serif', marginBottom: 3, textDecoration: 'none' }}>
                    {'\u{1F4DE}'} {contact}
                  </a>
                  <p style={{ fontSize: 10.5, color: 'rgba(252,165,165,0.45)' }}>{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Toggle + Crisis Center buttons */}
          <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
            <button onClick={() => setShowAllCrisis(v => !v)}
              style={{
                flex: 1, padding: '12px', borderRadius: 14,
                background: showAllCrisis ? 'rgba(248,113,113,0.12)' : 'rgba(248,113,113,0.06)',
                border: '1px solid rgba(248,113,113,0.18)',
                color: '#fca5a5', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 12.5,
                cursor: 'pointer', transition: 'all .25s ease',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(248,113,113,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = showAllCrisis ? 'rgba(248,113,113,0.12)' : 'rgba(248,113,113,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
              {showAllCrisis ? '\u2715 Collapse' : `\u{1F4CB} View All ${crisis.length} Helplines`}
            </button>
            <button onClick={openCrisisModal}
              style={{
                padding: '12px 20px', borderRadius: 14,
                background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)',
                color: '#fca5a5', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 12.5,
                cursor: 'pointer', transition: 'all .25s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(248,113,113,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
              {'\u{1F198}'} Crisis Center
            </button>
          </div>

          {/* Keyframes */}
          <style>{`
            @keyframes crisisSlideIn {
              0% { opacity: 0; transform: translateX(30px) scale(0.97); }
              100% { opacity: 1; transform: translateX(0) scale(1); }
            }
            @keyframes crisisGridIn {
              0% { opacity: 0; transform: translateY(12px) scale(0.95); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes crisisPulseGlow {
              0%, 100% { opacity: 0.7; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
          `}</style>
        </div>

        {/* Activities */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 20 }}>
            Recommended Activities
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }} className="stagger">
            {activities.map(({ title, desc, icon: Icon, color, bg, duration, action, label }: any) => (
              <div key={title} className="glass card-lift" style={{ borderRadius: 24, padding: 24, cursor: 'pointer' }}
                onClick={() => action?.()}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: bg, color, border: `1px solid ${color}33` }}>
                    {duration}
                  </span>
                </div>
                <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, color: '#FFFFFF', marginBottom: 8, fontSize: '0.95rem' }}>{title}</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: '#8B949E', marginBottom: 12 }}>{desc}</p>
                <span style={{ fontSize: 12, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {(label ?? (action ? 'Start Now' : 'Learn More'))} <ExternalLink size={11} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Articles + Video */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>

          {/* Articles */}
          <div className="glass" style={{ borderRadius: 24, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Book size={17} style={{ color: '#00E5FF' }} />
              </div>
              <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Educational Articles</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {articles.map(({ title, cat, time, url }) => (
                <a key={title} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block', borderRadius: 14, padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all .2s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', flex: 1, lineHeight: 1.4 }}>{title}</h3>
                    <span style={{ fontSize: 11, color: '#3d444d', marginLeft: 8, flexShrink: 0 }}>{time}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,229,255,0.1)', color: '#00E5FF' }}>{cat}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Video Resources + Quick Tips */}
          <div className="glass" style={{ borderRadius: 24, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(244,114,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={17} style={{ color: '#f472b6' }} />
              </div>
              <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Quick Wellness Tips</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { tip: '🌬️ Box breathing: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s', color: '#00E5FF' },
                { tip: '📵 Digital detox: 30 mins offline before bed improves sleep by 40%', color: '#fbbf24' },
                { tip: '🚶 Walk 10 minutes outdoors when you feel overwhelmed', color: '#34d399' },
                { tip: '📓 Write 3 things you\'re grateful for each morning', color: '#f472b6' },
                { tip: '🎵 Listen to 432Hz music for instant stress relief', color: '#7C3AED' },
                { tip: '💧 Dehydration worsens anxiety — drink 8 glasses daily', color: '#00E5FF' },
              ].map(({ tip, color }) => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: `${color}08`, border: `1px solid ${color}18` }}>
                  <p style={{ fontSize: 12.5, color: '#8B949E', lineHeight: 1.55 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Professional CTA */}
        <div style={{ borderRadius: 28, padding: '48px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,229,255,0.04))', border: '1px solid rgba(0,229,255,0.14)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 0%, rgba(0,229,255,0.08), transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏥</div>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 10 }}>
              Professional Support
            </h2>
            <p style={{ maxWidth: 500, margin: '0 auto', marginBottom: 28, fontSize: 14, lineHeight: 1.65, color: '#8B949E' }}>
              MindPulse is a support tool, not a replacement for professional care. If you're struggling, a licensed therapist can make all the difference.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <a href="https://www.practo.com/psychologists" target="_blank" rel="noopener noreferrer">
                <button className="btn-primary" style={{ padding: '0 28px', height: 46 }}>Find a Therapist</button>
              </a>
              <button className="btn-ghost" style={{ padding: '0 28px', height: 46 }} onClick={() => onNavigate('checkin')}>
                Continue Check-In
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Breathing Exercise Modal */}
      {showBreathing && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, background: 'rgba(6,11,24,0.92)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowBreathing(false)}>
          <div onClick={e => e.stopPropagation()} className="glass-md modal-enter" style={{ borderRadius: 28, padding: 0, maxWidth: 420, width: '100%', overflow: 'hidden' }}>
            <BreathingExercise onComplete={() => setShowBreathing(false)} />
          </div>
        </div>
      )}

      {/* Guided Meditation Modal */}
      {showMeditation && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, background: 'rgba(4,8,20,0.97)', backdropFilter: 'blur(24px)' }}
          onClick={() => setShowMeditation(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            borderRadius: 28, maxWidth: 680, width: '100%', height: '90vh',
            background: 'linear-gradient(145deg, rgba(251,191,36,0.06), rgba(15,20,40,0.98))',
            border: '1px solid rgba(251,191,36,0.15)',
            boxShadow: '0 0 80px rgba(251,191,36,0.08), 0 32px 80px rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(251,191,36,0.1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sun size={22} style={{ color: '#fbbf24' }} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: 2 }}>Guided Meditation</h2>
                    <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.6)', fontWeight: 500 }}>3 techniques · 5–10 min each</p>
                  </div>
                </div>
                <button onClick={() => setShowMeditation(false)}
                  style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#8B949E', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#x2715;</button>
              </div>
              <p style={{ fontSize: 13, color: '#8B949E', lineHeight: 1.7 }}>
                Guided meditation is a simple mental practice that helps individuals focus their attention, regulate their breathing,
                and become more aware of their thoughts and emotions. Short, structured techniques such as breathing exercises,
                grounding methods, and self-compassion practices can be especially helpful during moments of distress.
                When practiced regularly, these techniques can strengthen one’s ability to cope with difficult emotions more effectively.
              </p>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Technique 1 */}
              {[{
                title: 'Stress Relief Meditation', duration: '5 minutes', color: '#00E5FF', img: stressImg,
                steps: [
                  'Sit comfortably, back straight but not stiff',
                  'Close your eyes or soften your gaze',
                  'Inhale slowly for 4 seconds',
                  'Hold for 2 seconds',
                  'Exhale slowly for 6 seconds',
                  'Focus only on your breath',
                  'When your mind wanders, gently bring it back',
                ],
                why: ['Activates the parasympathetic nervous system', 'Slows heart rate and reduces cortisol'],
              }, {
                title: 'Anxiety Grounding Meditation', duration: '5–7 minutes', color: '#a78bfa', img: groundingImg,
                note: 'Use the 5-4-3-2-1 Technique. Sit comfortably and name:',
                steps: [
                  '5 things you can see',
                  '4 things you can feel',
                  '3 things you can hear',
                  '2 things you can smell',
                  '1 thing you can taste',
                ],
                footer: 'Do it slowly. No rush. Anxiety feeds on speed.',
                why: ['Pulls attention away from racing thoughts', 'Anchors you to the present moment'],
              }, {
                title: 'Depression Support Meditation', duration: '7–10 minutes', color: '#34d399', img: depressionImg,
                note: 'Self-Compassion Practice',
                steps: [
                  { text: 'Sit quietly and place a hand on your chest' },
                  { text: 'Breathe slowly and naturally' },
                  { text: 'Silently repeat:', sub: ['“This is a difficult moment”', '“I’m allowed to feel this”', '“I will take care of myself”'] },
                  { text: "Don't try to \"fix\" anything" },
                  { text: 'Just sit with the feeling, without fighting it' },
                ],
                why: ['Reduces self-criticism, which fuels depression', 'Builds emotional safety instead of resistance'],
              }].map(({ title, duration, color, img, note, steps, footer, why }, idx) => (
                <div key={title} className={`meditation-card meditation-card-${idx}`} style={{ borderRadius: 20, background: `${color}06`, border: `1px solid ${color}18`, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

                  {/* Compact image banner with title overlaid */}
                  <div style={{ position: 'relative', height: 130, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(6,10,22,0.96) 100%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14.5, color: '#FFFFFF', letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>{title}</h3>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${color}25`, color, border: `1px solid ${color}45`, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>{duration}</span>
                    </div>
                  </div>

                  {/* All text content */}
                  <div style={{ padding: '16px 20px 20px' }}>
                    {note && <p style={{ fontSize: 12.5, color: `${color}bb`, marginBottom: 12, fontStyle: 'italic', lineHeight: 1.5 }}>{note}</p>}

                    <p style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Steps</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: footer ? 10 : 14 }}>
                      {(steps as any[]).map((step, i) => (
                        <div key={i}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>{typeof step === 'string' ? step : step.text}</p>
                          </div>
                          {typeof step === 'object' && step.sub && (
                            <div style={{ marginLeft: 29, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {(step.sub as string[]).map((s, j) => (
                                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                  <span style={{ color, fontSize: 11, flexShrink: 0, marginTop: 2 }}>&#x25E6;</span>
                                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5, fontStyle: 'italic' }}>{s}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {footer && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 14, fontStyle: 'italic', lineHeight: 1.5 }}>{footer}</p>}

                    <div style={{ borderTop: `1px solid ${color}14`, paddingTop: 12 }}>
                      <p style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Why it works</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {(why as string[]).map((w, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ color, fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>&#x2713;</span>
                            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{w}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
