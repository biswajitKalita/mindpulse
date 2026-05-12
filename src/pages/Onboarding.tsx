import { useState } from 'react';
import { Brain, Shield, BarChart3, Heart, ArrowRight, Mic, Smile } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface OnboardingProps { onNavigate: (page: string) => void; }

export default function Onboarding({ onNavigate }: OnboardingProps) {
  const { state } = useApp();
  const firstName = state.user?.name?.split(' ')[0] || 'Friend';
  const [step, setStep]       = useState(0);
  const [animKey, setAnimKey] = useState(0);  // triggers re-animation on step change
  const [exiting, setExiting] = useState(false);

  const steps = [
    {
      icon: Brain, color: '#00E5FF', bg: 'rgba(0,229,255,0.12)', border: 'rgba(0,229,255,0.25)',
      badge: '👋 Welcome',
      title: `Hi ${firstName}, welcome to MindPulse!`,
      body: 'You\'ve just joined a smarter way to care for your mental health. MindPulse uses AI to detect early signs of distress — so you can act before burnout, anxiety, or depression takes hold.',
      visual: (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '20px 0' }}>
          {[
            { label: '✨ Great',       bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', color: '#34d399' },
            { label: '😊 Good',        bg: 'rgba(0,229,255,0.15)',  border: 'rgba(0,229,255,0.3)',  color: '#00E5FF' },
            { label: '⚖️ Okay',        bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa' },
            { label: '☁️ Low',         bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
            { label: '🌧️ Struggling',  bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
          ].map(({ label, bg, border, color }, i) => (
            <div key={label} style={{ padding: '6px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: bg, border: `1px solid ${border}`, color, animation: `countUp 0.3s ease forwards`, animationDelay: `${i * 0.1}s`, opacity: 0 }}>
              {label}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Shield, color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)',
      badge: '🔒 Privacy First',
      title: 'Your data stays with you',
      body: 'Everything you share — your thoughts, moods, and voice entries — is stored securely. We never sell or share your personal data. This tool supports you; it doesn\'t diagnose you.',
      visual: (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8, margin: '20px 0' }}>
          {[
            { icon: '🔐', label: 'Encrypted' },
            { icon: '📴', label: 'Local-first' },
            { icon: '🚫', label: 'Zero sharing' },
            { icon: '🎙️', label: 'Private audio' },
          ].map(({ icon, label }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', animation: `countUp 0.4s ease forwards`, animationDelay: `${i * 0.1}s`, opacity: 0 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: BarChart3, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)',
      badge: '📊 Wellness Score',
      title: 'Your wellness intelligence',
      body: 'After every check-in, our AI gives you a 0–100 wellness score. It weighs your mood, stress, sleep quality, and what you write or speak. Higher is better — regular check-ins make it smarter.',
      visual: (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0', flexWrap: 'wrap' }}>
          {[
            { range: '0–44',   label: 'At Risk',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
            { range: '45–69',  label: 'Moderate',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
            { range: '70–100', label: 'Healthy',   color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
          ].map(({ range, label, color, bg }, i) => (
            <div key={label} style={{ textAlign: 'center', padding: '12px 16px', borderRadius: 14, background: bg, border: `1px solid ${color}33`, animation: `countUp 0.4s ease forwards`, animationDelay: `${i * 0.12}s`, opacity: 0, flex: 1, minWidth: 80 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 800, color }}>{range}</div>
              <div style={{ fontSize: 11, color: '#8B949E', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Mic, color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)',
      badge: '🎙️ Voice Mode',
      title: 'Speak your mind',
      body: 'Don\'t feel like typing? Use our voice mode to speak your thoughts. Your words are transcribed in real-time and analyzed by our AI exactly like text — fast, private, and hands-free.',
      visual: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, margin: '24px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px rgba(244,114,182,0.07)', animation: 'countUp 0.5s ease forwards', opacity: 0 }}>
            <Mic size={28} style={{ color: '#f472b6' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', animation: 'countUp 0.5s ease forwards', animationDelay: '0.2s', opacity: 0 }}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={{ width: 4, borderRadius: 99, background: '#f472b6', height: `${10 + Math.sin(i * 1.5) * 12}px`, opacity: 0.8 }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Heart, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)',
      badge: "🚀 You're ready!",
      title: "Start your first session",
      body: 'It takes just 2–3 minutes. Track your mood, rate your stress and sleep, and log your thoughts. You\'ll instantly receive your personalized wellness insights.',
      visual: (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '24px 0', flexWrap: 'wrap' }}>
          {[
            { icon: <Smile size={18} style={{ color: '#00E5FF' }} />, step: '1', label: 'Rate mood' },
            { icon: <BarChart3 size={18} style={{ color: '#a78bfa' }} />, step: '2', label: 'Add details' },
            { icon: <Mic size={18} style={{ color: '#f472b6' }} />, step: '3', label: 'Log thoughts' },
          ].map(({ icon, step, label }, i) => (
            <div key={step} style={{ textAlign: 'center', animation: `countUp 0.4s ease forwards`, animationDelay: `${i * 0.12}s`, opacity: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{icon}</div>
              <div style={{ fontSize: 10, color: '#3d444d', fontWeight: 600 }}>STEP {step}</div>
              <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const goNext = () => {
    if (step === steps.length - 1) { onNavigate('checkin'); return; }
    setExiting(true);
    setTimeout(() => { setStep(s => s + 1); setAnimKey(k => k + 1); setExiting(false); }, 220);
  };

  const current  = steps[step];
  const Icon     = current.icon;
  const isLast   = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen grid-bg page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', paddingTop: 100, paddingBottom: 40 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #00E5FF, #a78bfa)', width: `${progress}%`, transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 0 10px rgba(167,139,250,0.5)' }} />
        </div>

        {/* Step counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#3d444d', fontWeight: 600 }}>Step {step + 1} of {steps.length}</span>
          <button onClick={() => onNavigate('checkin')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B949E', fontSize: 12, fontWeight: 500, transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FFFFFF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#8B949E'}>
            Skip walkthrough →
          </button>
        </div>

        {/* Main card */}
        <div
          key={animKey}
          className="glass card-lift"
          style={{ borderRadius: 28, padding: 'clamp(28px,5vw,40px)', textAlign: 'center', position: 'relative', overflow: 'hidden', opacity: exiting ? 0 : 1, transform: exiting ? 'scale(0.96) translateY(20px)' : 'scale(1) translateY(0)', transition: 'opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          {/* Ambient glow */}
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${current.color}15, transparent 75%)`, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, marginBottom: 24, background: current.bg, border: `1px solid ${current.border}`, color: current.color, boxShadow: `0 0 16px ${current.color}22` }}>
              {current.badge}
            </div>

            {/* Icon */}
            <div key={`icon-${animKey}`} className="icon-bounce"
              style={{ width: 84, height: 84, borderRadius: 24, background: current.bg, border: `1px solid ${current.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: `0 0 30px ${current.color}22, inset 0 0 20px ${current.color}11` }}>
              <Icon size={38} style={{ color: current.color }} />
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: '#FFFFFF', marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {current.title}
            </h1>

            {/* Body */}
            <p style={{ fontSize: 14, color: '#8B949E', lineHeight: 1.7, marginBottom: 8 }}>{current.body}</p>

            {/* Visual */}
            <div key={`visual-${animKey}`}>{current.visual}</div>

            {/* CTA */}
            <button onClick={goNext} className="btn-primary"
              style={{ width: '100%', padding: '15px', borderRadius: 16, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, fontFamily: 'Sora,sans-serif', fontWeight: 700, transition: 'all 0.25s', background: isLast ? 'linear-gradient(135deg,#00E5FF,#a78bfa)' : 'linear-gradient(135deg,#00E5FF,#00B4D8)', boxShadow: isLast ? '0 0 24px rgba(167,139,250,0.4)' : '0 10px 20px -10px rgba(0,229,255,0.4)', color: '#060b18' }}>
              {isLast ? 'Begin First Check-In' : 'Continue'}
              {!isLast && <ArrowRight size={16} />}
            </button>

            {/* Dots nav */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              {steps.map((_, i) => (
                <button key={i} onClick={() => { setAnimKey(k => k + 1); setStep(i); }}
                  aria-label={`Go to step ${i + 1}`}
                  style={{ width: i === step ? 24 : 6, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'all .35s cubic-bezier(0.34,1.56,0.64,1)', background: i === step ? current.color : 'rgba(255,255,255,0.12)', padding: 0 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
