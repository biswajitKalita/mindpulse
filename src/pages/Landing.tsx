import { Brain, Shield, TrendingUp, Heart, ArrowRight, ChevronDown } from 'lucide-react';
import Hero from '../components/Hero';
import ScrollReveal from '../components/ScrollReveal';
import MagneticTilt from '../components/MagneticTilt';

interface LandingProps { onNavigate: (page: string) => void; }

export default function Landing({ onNavigate }: LandingProps) {
  const features = [
    { icon: Brain,      title: 'AI-Powered Analysis',  desc: 'LSTM & BERT models analyze journal entries and voice patterns to detect emotional shifts in real time.', color: '#00E5FF', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.2)',  delay: 0.1 },
    { icon: Shield,     title: 'Privacy First',         desc: 'Data stays on-device with end-to-end encryption. We never store or sell your personal information.', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', delay: 0.3 },
    { icon: TrendingUp, title: 'Early Detection',       desc: 'Catch warning signs of burnout, anxiety, and depression weeks before they reach a crisis point.', color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  delay: 0.5 },
    { icon: Heart,      title: 'Personalized Support',  desc: 'Tailored recommendations based on your unique behavioral patterns and emotional fingerprint.', color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)', delay: 0.7 },
  ];

  const steps = [
    { n: '01', title: 'Create Account',    desc: 'Sign up free in under a minute. No credit card needed.',                             delay: 0.1, color: '#00E5FF' },
    { n: '02', title: 'Daily Check-In',    desc: 'Share your mood, stress level, and thoughts — by text or voice.',                    delay: 0.3, color: '#7C3AED' },
    { n: '03', title: 'Get Your Insights', desc: 'Receive a real-time risk score and personalized AI recommendations.',                 delay: 0.5, color: '#34d399' },
  ];

  return (
    <div style={{ height: '100dvh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>

      {/* ══ FRAME 1 — Hero ══ */}
      <section style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always', position: 'relative', overflow: 'hidden' }} className="grid-bg">
        <Hero onNavigate={onNavigate} />
      </section>

      {/* ══ FRAME 2 — Why MindPulse ══ */}
      <section style={{
        height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 24px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      }} className="grid-bg">

        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(0,229,255,0.05) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

        <div style={{ width: '100%', maxWidth: 1100 }}>
          {/* Heading */}
          <ScrollReveal delay={0}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <p style={{ color: '#00E5FF', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, opacity: 0.8 }}>CAPABILITIES</p>
              <h2 style={{
                fontFamily: 'Sora,sans-serif', fontSize: 'clamp(2rem,4.5vw,3.2rem)', fontWeight: 800, marginBottom: 10,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #00E5FF 50%, #FFFFFF 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em',
              }}>Why MindPulse?</h2>
              <p style={{ color: '#8B949E', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
                Built for students and young professionals who need proactive mental health support
              </p>
            </div>
          </ScrollReveal>

          {/* Feature cards with unique colors + animated border */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {features.map(({ icon: Icon, title, desc, color, bg, border, delay }) => (
              <ScrollReveal key={title} delay={delay}>
                <MagneticTilt>
                  <div style={{
                    borderRadius: 20, padding: '24px 20px', height: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${border}`,
                    boxShadow: `0 0 0 0 ${color}`,
                    transition: 'all 0.35s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    cursor: 'default',
                    backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${color}33, inset 0 0 24px ${color}08`;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.borderColor = color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.borderColor = border;
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 13, background: bg,
                      border: `1px solid ${color}33`, display: 'grid', placeItems: 'center', marginBottom: 16,
                      boxShadow: `0 0 16px ${color}22`,
                    }}>
                      <Icon size={22} style={{ color, filter: `drop-shadow(0 0 6px ${color}66)` }} />
                    </div>
                    <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>{title}</h3>
                    <p style={{ fontSize: '0.82rem', color: '#8B949E', lineHeight: 1.65 }}>{desc}</p>
                  </div>
                </MagneticTilt>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <ChevronDown size={18} style={{ color: '#3d444d', animation: 'bounce 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ══ FRAME 3 — How It Works ══ */}
      <section style={{
        height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 24px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      }} className="grid-bg">

        {/* Background glow */}
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(60px)' }} />

        <div style={{ width: '100%', maxWidth: 860 }}>
          <div style={{ borderRadius: 28, padding: 'clamp(28px,5vw,52px)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', boxShadow: '0 0 80px rgba(0,229,255,0.04)' }}>

            <ScrollReveal delay={0}>
              <div style={{ textAlign: 'center', marginBottom: 44 }}>
                <p style={{ color: '#00E5FF', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>PROCESS</p>
                <h2 style={{
                  fontFamily: 'Sora,sans-serif', fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: 800, marginBottom: 8,
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #7C3AED 50%, #FFFFFF 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em',
                }}>How It Works</h2>
              </div>
            </ScrollReveal>

            {/* Steps with connecting line */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 28, position: 'relative' }}>
              {/* Connector line — desktop only */}
              <div style={{ position: 'absolute', top: 30, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.3), rgba(124,58,237,0.3), rgba(52,211,153,0.3), transparent)', pointerEvents: 'none', zIndex: 0 }} />

              {steps.map(({ n, title, desc, delay, color }) => (
                <ScrollReveal key={n} delay={delay}>
                  <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    {/* Glowing number badge */}
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 18px',
                      fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color,
                      background: `${color}14`,
                      border: `2px solid ${color}44`,
                      boxShadow: `0 0 24px ${color}30, inset 0 0 16px ${color}08`,
                      animation: `stepGlow 3s ease-in-out infinite`,
                      animationDelay: delay + 's',
                    }}>
                      {n}
                    </div>
                    <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>{title}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#8B949E', lineHeight: 1.65 }}>{desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.7}>
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <button onClick={() => onNavigate('signup')} style={{
                  height: 50, fontSize: '0.95rem', padding: '0 36px', display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #00E5FF, #00B4D8)',
                  color: '#060b18', fontWeight: 700, fontFamily: 'Sora,sans-serif',
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  boxShadow: '0 0 28px rgba(0,229,255,0.35)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 44px rgba(0,229,255,0.55)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(0,229,255,0.35)'; }}>
                  Start Your Journey <ArrowRight size={16} />
                </button>
              </div>
            </ScrollReveal>
          </div>
        </div>

      </section>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); opacity: 0.4; }
          50%      { transform: translateY(6px); opacity: 0.8; }
        }
        @keyframes stepGlow {
          0%,100% { box-shadow: 0 0 20px currentColor20; }
          50%      { box-shadow: 0 0 36px currentColor50; }
        }
      `}</style>
    </div>
  );
}
