import { useState, useEffect, useRef } from 'react';

// ── Breathing pattern: 4-4-6-2 (inhale / hold / exhale / rest) ──────────────
type Phase = 'inhale' | 'hold' | 'exhale' | 'rest';

interface PhaseConfig {
  phase:    Phase;
  duration: number;   // seconds
  label:    string;
  sub:      string;
  scale:    number;   // orb target scale (1 = resting size)
  glow:     string;   // orb glow color
  ring:     string;   // progress ring color
  bg:       string;   // orb inner gradient
}

const PHASES: PhaseConfig[] = [
  { phase: 'inhale', duration: 4, label: 'Breathe In',  sub: 'Slowly through your nose',   scale: 1.35, glow: '#00E5FF', ring: '#00E5FF', bg: 'radial-gradient(circle, rgba(0,229,255,0.22) 0%, rgba(0,229,255,0.04) 70%)' },
  { phase: 'hold',   duration: 4, label: 'Hold',        sub: 'Still — feel the fullness',   scale: 1.35, glow: '#a78bfa', ring: '#a78bfa', bg: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(167,139,250,0.04) 70%)' },
  { phase: 'exhale', duration: 6, label: 'Breathe Out', sub: 'Slowly through your mouth',   scale: 1.0,  glow: '#34d399', ring: '#34d399', bg: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, rgba(52,211,153,0.03) 70%)' },
  { phase: 'rest',   duration: 2, label: 'Rest',        sub: 'Relax and prepare',            scale: 1.0,  glow: '#3d444d', ring: '#3d444d', bg: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' },
];

const TOTAL_CYCLES = 4;
const ORB_SIZE = 180; // diameter in px
const RING_R   = 78;
const RING_CIRC = 2 * Math.PI * RING_R;

// ── Ripple particle (one expanding ring) ─────────────────────────────────────
function Ripple({ color, delay }: { color: string; delay: number }) {
  return (
    <div style={{
      position: 'absolute',
      inset: -20,
      borderRadius: '50%',
      border: `1px solid ${color}`,
      opacity: 0,
      animation: `rippleOut 3s ease-out ${delay}s infinite`,
      pointerEvents: 'none',
    }} />
  );
}

export default function BreathingExercise({ onComplete }: { onComplete?: () => void }) {
  const [started,   setStarted]   = useState(false);
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycle,     setCycle]     = useState(1);
  const [done,      setDone]      = useState(false);
  const [timestamp, setTimestamp] = useState(0); // forces orb transition restart
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cur = PHASES[phaseIdx];
  const progress = started ? 1 - countdown / cur.duration : 0;
  const ringDash = progress * RING_CIRC;

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || done) return;
    intervalRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          // Advance phase
          const nextIdx = (phaseIdx + 1) % PHASES.length;
          const isNewCycle = nextIdx === 0;
          if (isNewCycle && cycle >= TOTAL_CYCLES) {
            setDone(true);
            setStarted(false);
            onComplete?.();
            return PHASES[phaseIdx].duration;
          }
          if (isNewCycle) setCycle(prev => prev + 1);
          setPhaseIdx(nextIdx);
          setTimestamp(Date.now());
          return PHASES[nextIdx].duration;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, phaseIdx, cycle, done]);

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStarted(false); setPhaseIdx(0);
    setCountdown(PHASES[0].duration); setCycle(1); setDone(false);
  };

  // ── Orb transition timing ─────────────────────────────────────────────────
  const orbTransition = (() => {
    if (!started) return 'transform 0.8s ease, background 0.8s ease, box-shadow 0.8s ease';
    if (cur.phase === 'inhale') return `transform ${cur.duration}s cubic-bezier(0.4,0,0.2,1), background ${cur.duration}s ease, box-shadow ${cur.duration}s ease`;
    if (cur.phase === 'exhale') return `transform ${cur.duration}s cubic-bezier(0.4,0,0.2,1), background ${cur.duration}s ease, box-shadow ${cur.duration}s ease`;
    return 'transform 0.6s ease, background 0.6s ease, box-shadow 0.6s ease';
  })();

  const orbScale = started ? cur.scale : 1;

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>

      {/* Inject keyframes */}
      <style>{`
        @keyframes rippleOut {
          0%   { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.9);  opacity: 0;   }
        }
        @keyframes orbIdlePulse {
          0%, 100% { transform: scale(1.0); opacity: 0.7; }
          50%       { transform: scale(1.06); opacity: 1;  }
        }
        @keyframes breatheLabel {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0);   }
        }
        @keyframes doneEntrance {
          0%   { opacity: 0; transform: scale(0.9) translateY(12px); }
          100% { opacity: 1; transform: scale(1)   translateY(0);    }
        }
      `}</style>

      {done ? (
        /* ── Completion state ─────────────────────────────────────────────── */
        <div style={{ animation: 'doneEntrance 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          <div style={{ fontSize: 52, marginBottom: 14, filter: 'drop-shadow(0 0 16px rgba(52,211,153,0.6))' }}>✨</div>
          <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
            Well done!
          </h3>
          <p style={{ fontSize: 13, color: '#8B949E', marginBottom: 6, lineHeight: 1.7 }}>
            You completed <strong style={{ color: '#34d399' }}>{TOTAL_CYCLES} full cycles</strong> of box breathing.
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', marginBottom: 24 }}>Your nervous system is calming. Take a moment to notice how you feel.</p>
          <button onClick={reset}
            style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', fontFamily: 'Sora,sans-serif' }}>
            Do it again
          </button>
        </div>

      ) : (
        <>
          {/* ── Animated Orb ─────────────────────────────────────────────── */}
          <div style={{ position: 'relative', width: ORB_SIZE, height: ORB_SIZE, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Ripple rings — only visible during inhale */}
            {started && cur.phase === 'inhale' && <>
              <Ripple color={cur.glow} delay={0} />
              <Ripple color={cur.glow} delay={1} />
              <Ripple color={cur.glow} delay={2} />
            </>}

            {/* SVG progress ring */}
            <svg
              width={ORB_SIZE} height={ORB_SIZE}
              style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
            >
              {/* Track */}
              <circle
                cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={RING_R}
                stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="transparent"
              />
              {/* Fill */}
              {started && (
                <circle
                  cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={RING_R}
                  stroke={cur.ring} strokeWidth="3" fill="transparent"
                  strokeDasharray={`${ringDash} ${RING_CIRC}`}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dasharray 0.18s linear',
                    filter: `drop-shadow(0 0 4px ${cur.ring})`,
                  }}
                />
              )}
            </svg>

            {/* Central orb blob */}
            <div style={{
              width:        '70%',
              height:       '70%',
              borderRadius: '50%',
              background:   started ? cur.bg : 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
              boxShadow:    started
                ? `0 0 40px ${cur.glow}55, 0 0 80px ${cur.glow}22, inset 0 0 30px ${cur.glow}15`
                : '0 0 20px rgba(255,255,255,0.04)',
              border:       `1px solid ${started ? cur.glow + '40' : 'rgba(255,255,255,0.08)'}`,
              transform:    `scale(${orbScale})`,
              transition:   orbTransition,
              display:      'flex',
              flexDirection: 'column',
              alignItems:   'center',
              justifyContent: 'center',
              animation:    !started ? 'orbIdlePulse 3s ease-in-out infinite' : 'none',
            }}>
              {/* Countdown number */}
              <span style={{
                fontFamily: 'Sora,sans-serif',
                fontSize:   started ? 38 : 22,
                fontWeight: 800,
                color:      started ? cur.glow : '#3d444d',
                lineHeight: 1,
                transition: 'font-size 0.3s ease, color 0.5s ease',
                textShadow: started ? `0 0 20px ${cur.glow}` : 'none',
              }}>
                {started ? countdown : '4·4·6'}
              </span>
              {started && (
                <span style={{ fontSize: 9, color: cur.glow + 'aa', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  sec
                </span>
              )}
            </div>
          </div>

          {/* ── Phase label ──────────────────────────────────────────────── */}
          {started ? (
            <div key={`${phaseIdx}-${timestamp}`} style={{ marginBottom: 18, animation: 'breatheLabel 0.35s ease forwards' }}>
              <p style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 700, color: cur.glow, marginBottom: 5, textShadow: `0 0 12px ${cur.glow}66` }}>
                {cur.label}
              </p>
              <p style={{ fontSize: 12, color: '#8B949E' }}>{cur.sub}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <div style={{ height: 1, width: 24, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, color: '#3d444d' }}>Cycle {cycle} / {TOTAL_CYCLES}</span>
                <div style={{ height: 1, width: 24, background: 'rgba(255,255,255,0.08)' }} />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 5 }}>
                Box Breathing — 4·4·6·2
              </p>
              <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.7 }}>
                Used by therapists, athletes & first responders.<br />
                Activates your calm response in under 3 minutes.
              </p>
            </div>
          )}

          {/* ── Phase step dots ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 22 }}>
            {PHASES.map((p, i) => {
              const isActive = started && phaseIdx === i;
              const isPast   = started && i < phaseIdx;
              return (
                <div key={p.phase} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: !started ? 0.35 : 1, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: isActive ? 10 : 6,
                    height: isActive ? 10 : 6,
                    borderRadius: '50%',
                    background: isActive ? p.glow : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? `0 0 8px ${p.glow}` : 'none',
                    transition: 'all 0.3s ease',
                  }} />
                  <span style={{ fontSize: 9, color: isActive ? p.glow : '#3d444d', transition: 'color 0.3s' }}>
                    {p.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Controls ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => setStarted(s => !s)}
              style={{
                padding: '11px 32px', borderRadius: 14,
                background: started
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg,#00E5FF,#00B4D8)',
                border: started ? '1px solid rgba(255,255,255,0.1)' : 'none',
                color: started ? '#8B949E' : '#060b18',
                fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', transition: 'all .25s',
                boxShadow: started ? 'none' : '0 4px 20px rgba(0,229,255,0.35)',
              }}
            >
              {started ? 'Pause' : 'Begin'}
            </button>
            {(started || cycle > 1) && (
              <button onClick={reset}
                style={{ padding: '11px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#3d444d', fontSize: 13, cursor: 'pointer', transition: 'all .2s' }}>
                Reset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
