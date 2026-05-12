import React, { useState } from 'react';

const Svg1 = () => (
  <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
    <path d="M32 6C18 6 8 16 8 28c0 8 4 14 10 18v6c0 2 2 4 4 4h20c2 0 4-2 4-4v-6c6-4 10-10 10-18C56 16 46 6 32 6z" stroke="#fff" strokeWidth="2" />
    <path d="M12 30 L22 30 L26 18 L34 46 L38 26 L42 30 L52 30" stroke="#00E5FF" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="52" cy="30" r="2.5" fill="#00E5FF" />
  </svg>
);

const Svg2 = () => (
  <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
    <circle cx="32" cy="32" r="5" fill="#00E5FF" />
    <circle cx="32" cy="12" r="3" fill="#fff" />
    <circle cx="52" cy="24" r="3" fill="#fff" />
    <circle cx="52" cy="44" r="3" fill="#fff" />
    <circle cx="32" cy="54" r="3" fill="#fff" />
    <circle cx="12" cy="44" r="3" fill="#fff" />
    <circle cx="12" cy="24" r="3" fill="#fff" />
    <path d="M32 15 L32 27 M49 25 L36 30 M49 43 L36 34 M32 51 L32 37 M15 43 L28 34 M15 25 L28 30" stroke="#00E5FF" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" />
    <path d="M32 12 L52 24 L52 44 L32 54 L12 44 L12 24 Z" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.3" strokeLinejoin="round" />
  </svg>
);

const Svg3 = () => (
  <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
    <path d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M16 32 C 16 16, 32 16, 32 32 C 32 48, 48 48, 48 32" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="32" r="3.5" fill="#00E5FF" />
    <circle cx="48" cy="32" r="3.5" fill="#00E5FF" />
  </svg>
);

const Svg4 = () => (
  <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
    <path d="M4 32 C 16 16, 48 16, 60 32 C 48 48, 16 48, 4 32 Z" stroke="#fff" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="14" stroke="#00E5FF" strokeWidth="2" />
    <circle cx="32" cy="32" r="4.5" fill="#fff" />
    <path d="M32 20 L32 26 M44 32 L38 32 M32 44 L32 38 M20 32 L26 32" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Svg5 = () => (
  <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
    <path d="M32 4 A 28 28 0 0 0 32 60" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 4 A 28 28 0 0 1 32 60" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />
    <path d="M14 32 L24 32 L28 20 L36 46 L40 32 L50 32" stroke="#00E5FF" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="50" cy="32" r="3" fill="#fff" />
  </svg>
);

const Svg6 = () => (
  <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
    <path d="M16 50 L16 16 L32 32 L48 16 L48 50" stroke="#fff" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M32 32 C 52 32, 52 16, 32 16" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
    <circle cx="32" cy="48" r="3.5" fill="#00E5FF" />
  </svg>
);

export default function LogoShowcase() {
  const [active, setActive] = useState(0);

  const logos = [
    { title: "1. Pulse Brain", desc: "Refined modern version of your current concept", Svg: Svg1 },
    { title: "2. Neural Node", desc: "Minimal AI constellation matrix (Best for startups)", Svg: Svg2 },
    { title: "3. Hexagon Brain", desc: "Structured, trustworthy geometric tech", Svg: Svg3 },
    { title: "4. Eye of Mind", desc: "Awareness, early detection & vision", Svg: Svg4 },
    { title: "5. Pulse Ring", desc: "Extremely clean Apple-style circular icon", Svg: Svg5 },
    { title: "6. Abstract MP", desc: "Pure typography lettermark (M+P)", Svg: Svg6 }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
      <div style={{ width: 900, background: '#080a10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        
        <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 8, fontFamily: 'Sora' }}>MindPulse Premium Logo Concepts</h2>
        <p style={{ color: '#8b949e', marginBottom: 30 }}>Review these fully-scalable SVG designs natively in your browser.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {logos.map((logo, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                background: active === i ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                border: active === i ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                transition: 'all .2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <logo.Svg />
                <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 22, color: '#FFFFFF', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
                  <span>Mind</span>
                  <span style={{ background: 'linear-gradient(135deg,#00E5FF,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pulse</span>
                </span>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: active === i ? '#00e5ff' : '#fff', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{logo.title}</div>
                <div style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.4 }}>{logo.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={() => document.getElementById('logo-showcase')?.remove()}
          style={{ width: '100%', marginTop: 30, padding: 14, background: 'linear-gradient(135deg,#00E5FF,#0099cc)', borderRadius: 12, border: 'none', color: '#000', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
        >
          Close Preview (or choose one to implement)
        </button>
      </div>
    </div>
  );
}
