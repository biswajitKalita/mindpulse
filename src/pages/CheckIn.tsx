import { useState, useEffect, useRef } from 'react';
import { Send, Lock, Sparkles, Mic, MicOff, RotateCcw, Type, Volume2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useCrisis } from '../context/CrisisContext';
import { apiAnalyzeVoice } from '../services/api';
import type { AnalysisResult } from '../services/api';

interface CheckInProps { onNavigate: (page: string) => void; }

const MOODS = [
  { id: 'excellent',  label: 'Excellent',  emoji: '\uD83E\uDD29', grad: 'linear-gradient(135deg,rgba(0,229,255,0.18),rgba(0,255,180,0.10))', border: 'rgba(0,229,255,0.45)',  glow: 'rgba(0,229,255,0.35)',  text: '#00E5FF' },
  { id: 'good',       label: 'Good',       emoji: '\uD83D\uDE0A', grad: 'linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.10))', border: 'rgba(52,211,153,0.45)', glow: 'rgba(52,211,153,0.35)', text: '#34d399' },
  { id: 'okay',       label: 'Okay',       emoji: '\uD83D\uDE10', grad: 'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.10))', border: 'rgba(251,191,36,0.45)', glow: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
  { id: 'low',        label: 'Low',        emoji: '\uD83D\uDE14', grad: 'linear-gradient(135deg,rgba(167,139,250,0.18),rgba(139,92,246,0.10))', border: 'rgba(167,139,250,0.45)',glow: 'rgba(167,139,250,0.3)', text: '#a78bfa' },
  { id: 'struggling', label: 'Struggling', emoji: '\uD83D\uDE1E', grad: 'linear-gradient(135deg,rgba(248,113,113,0.18),rgba(239,68,68,0.10))',  border: 'rgba(248,113,113,0.45)',glow: 'rgba(248,113,113,0.3)', text: '#f87171' },
];

const TAGS = ['Work', 'Study', 'Relationships', 'Health', 'Finance', 'Social', 'Sleep', 'Family', 'Self-care', 'Exercise'];

const STEPS = [
  { num: 1, label: 'Mood' },
  { num: 2, label: 'Vitals' },
  { num: 3, label: 'Reflect' },
  { num: 4, label: 'Results' },
];

/* ═══════════════════════════════════════
   MICRO-ASSESSMENT — Psychometric question sets
   Replaces raw 0-10 sliders for Stress / Energy / Sleep
═══════════════════════════════════════ */

const STRESS_QUESTIONS = [
  {
    text: 'How often did you feel mentally overloaded today?',
    options: [
      { label: 'Rarely / not at all', value: 1 },
      { label: 'A few times',         value: 2 },
      { label: 'Quite often',         value: 3 },
      { label: 'Almost constantly',   value: 4 },
    ],
  },
  {
    text: 'How hard was it to quiet your thoughts when you needed to?',
    options: [
      { label: 'No trouble at all',  value: 1 },
      { label: 'Slightly difficult', value: 2 },
      { label: 'Quite difficult',    value: 3 },
      { label: 'Couldn\'t switch off', value: 4 },
    ],
  },
  {
    text: 'How would you describe your sense of control over the day?',
    options: [
      { label: 'Fully in control',  value: 1 },
      { label: 'Mostly in control', value: 2 },
      { label: 'Somewhat lost it', value: 3 },
      { label: 'Out of control',   value: 4 },
    ],
  },
];

const ENERGY_QUESTIONS = [
  {
    text: 'How was your physical energy through most of today?',
    options: [
      { label: 'High and sustained',  value: 4 },
      { label: 'Moderate',            value: 3 },
      { label: 'Low but manageable',  value: 2 },
      { label: 'Very low / depleted', value: 1 },
    ],
  },
  {
    text: 'How hard was it to get started or stay focused on tasks?',
    options: [
      { label: 'Effortless',           value: 4 },
      { label: 'Minor friction',       value: 3 },
      { label: 'Noticeably hard',      value: 2 },
      { label: 'Couldn\'t get started', value: 1 },
    ],
  },
  {
    text: 'Did you feel mentally sharp or foggy today?',
    options: [
      { label: 'Clear and sharp',    value: 4 },
      { label: 'Mostly clear',       value: 3 },
      { label: 'Somewhat foggy',     value: 2 },
      { label: 'Very foggy / flat',  value: 1 },
    ],
  },
];

const SLEEP_OPTIONS = [
  { label: 'Under 4 hrs', value: 2  },
  { label: '4 – 5 hrs',   value: 4  },
  { label: '6 hrs',       value: 6  },
  { label: '7 hrs',       value: 8  },
  { label: '8 + hrs',     value: 10 },
];

/** Map N stress answers (each 1–4, higher=more stressed) → 0-10 stressLevel */
function aggregateStressAnswers(ans: (number|null)[]): number {
  const n = ans.length;
  const raw = ans.reduce((s, a) => s + (a ?? 1), 0);
  return Math.min(10, Math.max(0, Math.round(((raw - n) / (n * 3)) * 10)));
}

/** Map N energy answers (each 1–4, higher=more energetic) → 0-10 energyLevel */
function aggregateEnergyAnswers(ans: (number|null)[]): number {
  const n = ans.length;
  const raw = ans.reduce((s, a) => s + (a ?? 1), 0);
  return Math.min(10, Math.max(0, Math.round(((raw - n) / (n * 3)) * 10)));
}

/* Pill button used in the micro-assessment */
function PillOption({ label, selected, accent, onClick }: { label: string; selected: boolean; accent: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
      cursor: 'pointer', transition: 'all .18s', textAlign: 'left', lineHeight: 1.35,
      background : selected ? `${accent}18` : 'rgba(255,255,255,0.03)',
      border     : `1.5px solid ${selected ? accent : 'rgba(255,255,255,0.07)'}`,
      color      : selected ? accent : '#64748b',
      boxShadow  : selected ? `0 0 14px ${accent}28` : 'none',
      transform  : selected ? 'scale(1.02)' : 'scale(1)',
    }}>{label}</button>
  );
}

/* Small section header for each dimension */
function DimHeader({ icon, label, accent, answered, total }: { icon: string; label: string; accent: string; answered: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <span style={{ fontSize: 17 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', transition: 'background .2s',
            background: i < answered ? accent : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
    </div>
  );
}


const SZ = 160;          // SVG viewport size
const R  = 62;           // arc radius
const SW = 13;           // stroke width
const CX = SZ / 2;
const CY = SZ / 2;
const ARC_START = 225;   // degrees clockwise-from-top (7:30 position)
const ARC_SWEEP = 270;   // total degrees

/** Convert clock-angle (0=top, CW) → SVG x,y point on radius R */
function pta(angleDeg: number) {
  const rad = angleDeg * Math.PI / 180;
  return { x: +(CX + R * Math.sin(rad)).toFixed(3), y: +(CY - R * Math.cos(rad)).toFixed(3) };
}

/** Build SVG arc path from startDeg, sweeping sweepDeg clockwise */
function arcD(startDeg: number, sweepDeg: number) {
  if (sweepDeg <= 0) return '';
  if (sweepDeg >= 360) sweepDeg = 359.99;
  const s = pta(startDeg);
  const e = pta(startDeg + sweepDeg);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** Lerp between two hex-ish RGB triples */
function lerpRGB(a: [number,number,number], b: [number,number,number], t: number): string {
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
}

type ColorFn = (v: number) => string;

const stressColor: ColorFn = v => {
  const t = v / 10;
  if (t < 0.5) return lerpRGB([52,211,153],[251,191,36], t * 2);     // green→yellow
  return lerpRGB([251,191,36],[248,113,113], (t - 0.5) * 2);          // yellow→red
};
const sleepColor: ColorFn = v => {
  const t = v / 10;
  if (t < 0.5) return lerpRGB([248,113,113],[251,191,36], t * 2);     // red→yellow
  return lerpRGB([251,191,36],[0,229,255], (t - 0.5) * 2);            // yellow→cyan
};
const energyColor: ColorFn = v => {
  const t = v / 10;
  if (t < 0.5) return lerpRGB([248,113,113],[251,191,36], t * 2);     // red→yellow
  return lerpRGB([251,191,36],[167,139,250], (t - 0.5) * 2);          // yellow→purple
};

interface CircularSliderProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  icon: string;
  getColor: ColorFn;
}

function CircularSlider({ value, onChange, label, icon, getColor }: CircularSliderProps) {
  const svgRef   = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const color    = getColor(value);

  const angleFromEvent = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width  / 2);
    const dy = clientY - (rect.top  + rect.height / 2);
    // atan2(dx, -dy) gives clockwise-from-top angle in screen coords
    let deg = Math.atan2(dx, -dy) * 180 / Math.PI;
    deg = (deg + 360) % 360;
    // Relative to arc start
    let rel = (deg - ARC_START + 360) % 360;
    if (rel > ARC_SWEEP) rel = rel > ARC_SWEEP + 45 ? 0 : ARC_SWEEP;
    return Math.round((rel / ARC_SWEEP) * 10);
  };

  const applyDrag = (clientX: number, clientY: number) => {
    const v = angleFromEvent(clientX, clientY);
    if (v !== null) onChange(v);
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => { dragging.current = true; applyDrag(e.clientX, e.clientY); };
  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragging.current) applyDrag(e.clientX, e.clientY); };
    const up   = () => { dragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  // Touch events
  const onTouchStart = (e: React.TouchEvent<SVGSVGElement>) => { dragging.current = true; applyDrag(e.touches[0].clientX, e.touches[0].clientY); };
  useEffect(() => {
    const move = (e: TouchEvent) => { if (dragging.current && e.touches[0]) applyDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const up   = () => { dragging.current = false; };
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, []);

  const filledSweep = (value / 10) * ARC_SWEEP;
  const handlePt    = pta(ARC_START + filledSweep);
  const trackD      = arcD(ARC_START, ARC_SWEEP);
  const fillD       = arcD(ARC_START, filledSweep);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
      <div style={{ position: 'relative', width: SZ, height: SZ }}>
        <svg ref={svgRef} width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ cursor: 'grab', overflow: 'visible' }}
          onMouseDown={onMouseDown} onTouchStart={onTouchStart}>

          {/* Glow filter */}
          <defs>
            <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track */}
          <path d={trackD} stroke="rgba(255,255,255,0.06)" strokeWidth={SW} fill="none" strokeLinecap="round" />

          {/* Filled arc with glow */}
          {filledSweep > 0 && <>
            {/* Glow layer */}
            <path d={fillD} stroke={color} strokeWidth={SW + 4} fill="none" strokeLinecap="round" opacity={0.25} filter={`url(#glow-${label})`} />
            {/* Main fill */}
            <path d={fillD} stroke={color} strokeWidth={SW} fill="none" strokeLinecap="round" />
          </>}

          {/* Drag handle */}
          {value > 0 && <>
            <circle cx={handlePt.x} cy={handlePt.y} r={SW / 2 + 3} fill="rgba(0,0,0,0.6)" />
            <circle cx={handlePt.x} cy={handlePt.y} r={SW / 2 + 1} fill="#fff" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
          </>}
        </svg>

        {/* Center label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
          <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 26, fontWeight: 800, color, lineHeight: 1.1, marginTop: 4, filter: `drop-shadow(0 0 8px ${color})`, transition: 'color .2s' }}>{value}</span>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>/ 10</span>
        </div>
      </div>

      {/* Label below */}
      <p style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</p>

      {/* Quick-tap dots */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 0, transition: 'all .15s',
              background: n === value ? color : n < value ? `${color}44` : 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SIRI-STYLE ORB COMPONENT
   Canvas morphing blob with audio reactivity
═══════════════════════════════════════ */
// ─── Upgrade #1: Live emotion keyword detector ───────────────────────────────
const LIVE_EMOTION_LEXICON: Record<string, { color: string; label: string; emoji: string }> = {
  // Anxiety / stress
  anxious:   { color: '#f97316', label: 'Anxiety',    emoji: '😰' },
  anxiety:   { color: '#f97316', label: 'Anxiety',    emoji: '😰' },
  worried:   { color: '#f97316', label: 'Worried',    emoji: '😟' },
  stressed:  { color: '#f97316', label: 'Stressed',   emoji: '😤' },
  panic:     { color: '#ef4444', label: 'Panic',      emoji: '😱' },
  nervous:   { color: '#f97316', label: 'Nervous',    emoji: '😬' },
  fear:      { color: '#ef4444', label: 'Fear',       emoji: '😨' },
  scared:    { color: '#ef4444', label: 'Scared',     emoji: '😨' },
  // Sadness
  sad:       { color: '#a78bfa', label: 'Sadness',    emoji: '😢' },
  depressed: { color: '#7c3aed', label: 'Depressed',  emoji: '😞' },
  hopeless:  { color: '#7c3aed', label: 'Hopeless',   emoji: '😞' },
  lonely:    { color: '#a78bfa', label: 'Lonely',     emoji: '😔' },
  crying:    { color: '#a78bfa', label: 'Sadness',    emoji: '😢' },
  empty:     { color: '#6d28d9', label: 'Empty',      emoji: '😶' },
  // Exhaustion
  tired:     { color: '#fbbf24', label: 'Tired',      emoji: '😴' },
  exhausted: { color: '#fbbf24', label: 'Exhausted',  emoji: '🥱' },
  drained:   { color: '#fbbf24', label: 'Drained',    emoji: '🪫'  },
  overwhelmed:{ color: '#fbbf24', label: 'Overwhelmed', emoji: '😵' },
  burnout:   { color: '#d97706', label: 'Burnout',    emoji: '🔥' },
  // Joy / positive
  happy:     { color: '#34d399', label: 'Happy',      emoji: '😊' },
  grateful:  { color: '#34d399', label: 'Grateful',   emoji: '🙏' },
  excited:   { color: '#34d399', label: 'Excited',    emoji: '🤩' },
  love:      { color: '#34d399', label: 'Love',       emoji: '❤️' },
  amazing:   { color: '#34d399', label: 'Amazing',    emoji: '✨' },
  wonderful: { color: '#34d399', label: 'Wonderful',  emoji: '🌟' },
  // Hope
  hopeful:   { color: '#00E5FF', label: 'Hopeful',    emoji: '🌱' },
  better:    { color: '#00E5FF', label: 'Improving',  emoji: '📈' },
  motivated: { color: '#00E5FF', label: 'Motivated',  emoji: '💪' },
  trying:    { color: '#00E5FF', label: 'Trying',     emoji: '🔄' },
  // Anger
  angry:     { color: '#ef4444', label: 'Anger',      emoji: '😠' },
  furious:   { color: '#ef4444', label: 'Angry',      emoji: '🤬' },
  frustrated:{ color: '#f97316', label: 'Frustrated', emoji: '😤' },
};

/** Detect all emotion keywords in text — returns unique matches */
function detectLiveEmotions(text: string): { key: string; color: string; label: string; emoji: string }[] {
  const clean  = text.toLowerCase().replace(/[^a-z ]/g, ' ');
  const words  = clean.split(/\s+/);
  const seen   = new Set<string>();
  const result: { key: string; color: string; label: string; emoji: string }[] = [];
  for (const word of words) {
    const match = LIVE_EMOTION_LEXICON[word];
    if (match && !seen.has(match.label)) {
      seen.add(match.label);
      result.push({ key: word, ...match });
    }
  }
  return result.slice(0, 5); // max 5 chips
}

/** Dominant emotion color from detected emotions (for orb coloring) */
function dominantOrbColor(emotions: { color: string }[]): string | null {
  return emotions.length > 0 ? emotions[0].color : null;
}

// ─── Upgrade #2: Smart auto-punctuation ──────────────────────────────────────
function autoPunctuate(text: string): string {
  if (!text.trim()) return text;
  let t = text.trim();
  // Remove trailing space before adding punctuation
  // Add period if ends with word char (no existing punctuation)
  if (/[a-z0-9]$/i.test(t)) t += '.';
  // Capitalize first letter of each sentence
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, l) => p + l.toUpperCase());
  // Remove filler words
  t = t.replace(/\b(um|uh|er|hmm)\b,?\s*/gi, '');
  // Fix double spaces
  t = t.replace(/\s{2,}/g, ' ');
  return t.trim();
}

interface SiriOrbProps {
  status: string;
  onToggle: () => void;
  journalText: string;
  interimText: string;
  onClear: () => void;
  onAppend: () => void;
  isAppendMode: boolean;
  voiceStatusLabel: string;
  emotionColor: string | null;
}

/* ═══════════════════════════════════════════════════════════
   NEURAL VOICE RECORDER — Premium Dark-Mode Audio Card
   Central glowing mic orb · 48-bar waveform · Emotion chips
═══════════════════════════════════════════════════════════ */
function SiriOrb({ status, onToggle, journalText, interimText, onClear, onAppend, isAppendMode, voiceStatusLabel, emotionColor }: SiriOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);
  const ampRef    = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [seconds, setSeconds] = useState(0);

  const listening  = status === 'listening';
  const processing = status === 'processing';

  /* Timer */
  useEffect(() => {
    if (listening) {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (!processing) setSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [listening, processing]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* Live emotions */
  const allText      = journalText + ' ' + interimText;
  const liveEmotions = detectLiveEmotions(allText);
  const activeColor  = (listening && liveEmotions.length > 0)
    ? liveEmotions[0].color
    : (emotionColor ?? '#00E5FF');

  /* Hex → RGB */
  const hex2rgb = (hex: string) => ({
    r: parseInt(hex.slice(1,3),16),
    g: parseInt(hex.slice(3,5),16),
    b: parseInt(hex.slice(5,7),16),
  });

  /* ── Canvas waveform ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const BARS = 48;
    const barW = W / BARS;
    const tgt = { v: 0 };

    const draw = () => {
      tRef.current += 0.022;
      const t = tRef.current;
      if (listening)       tgt.v = 0.55 + Math.abs(Math.sin(t * 1.6)) * 0.4;
      else if (processing) tgt.v = 0.15 + Math.abs(Math.sin(t * 5))   * 0.15;
      else                 tgt.v = 0.04 + Math.abs(Math.sin(t * 0.8)) * 0.05;
      ampRef.current += (tgt.v - ampRef.current) * 0.1;
      const amp = ampRef.current;

      ctx.clearRect(0, 0, W, H);
      const { r, g, b } = hex2rgb(activeColor);
      const midY = H / 2;

      /* Ambient glow */
      if (listening) {
        const glow = ctx.createRadialGradient(W/2, midY, 0, W/2, midY, W * 0.5);
        glow.addColorStop(0, `rgba(${r},${g},${b},${amp * 0.07})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }

      for (let i = 0; i < BARS; i++) {
        const norm  = i / (BARS - 1);
        const phase = norm * Math.PI * 4;
        const h1 = Math.abs(Math.sin(phase + t * 2.1))   * 0.40;
        const h2 = Math.abs(Math.sin(phase * 1.7 - t * 1.4)) * 0.35;
        const h3 = Math.abs(Math.sin(phase * 3   + t * 3.5)) * 0.25;
        const barH  = Math.max(3, (h1 + h2 + h3) * H * 0.88 * amp);
        const x     = i * barW + barW * 0.2;
        const bw    = barW * 0.6;
        const topY  = midY - barH / 2;

        /* Gradient bar — top bright, mid dim */
        const grad = ctx.createLinearGradient(x, topY, x, topY + barH);
        const alpha = listening ? 0.9 : 0.45;
        grad.addColorStop(0,    `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.5,  `rgba(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)},${alpha * 0.8})`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},${alpha})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, topY, bw, barH, 3);
        else ctx.rect(x, topY, bw, barH);
        ctx.fill();
      }

      /* Center baseline */
      const line = ctx.createLinearGradient(0, 0, W, 0);
      line.addColorStop(0,   'rgba(0,0,0,0)');
      line.addColorStop(0.2, `rgba(${r},${g},${b},${amp * 0.2})`);
      line.addColorStop(0.8, `rgba(${r},${g},${b},${amp * 0.2})`);
      line.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [listening, processing, activeColor]);

  const wordCount = (journalText + ' ' + (interimText ?? '')).trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '4px 0 10px' }}>

      {/* ── Central orb + waveform card ── */}
      <div style={{
        position: 'relative', width: '100%', borderRadius: 24, overflow: 'hidden', minHeight: 320,
        background: 'rgba(4,8,20,0.5)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${listening ? activeColor + '40' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: listening ? `0 0 60px ${activeColor}22, 0 4px 40px rgba(0,0,0,0.5)` : '0 4px 40px rgba(0,0,0,0.4)',
        transition: 'all .5s ease',
      }}>

        {/* Spline 3D — voice card background */}
        <iframe
          src="https://my.spline.design/waveform-IiVMUsYbivPXZ7Amw3v5ucKW/"
          frameBorder="0"
          title="Spline 3D Waveform"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none', pointerEvents: 'none', zIndex: 0,
            opacity: listening ? 1 : 0.55,
            transition: 'opacity 0.6s ease',
          }}
        />

        {/* Watermark cover — solid opaque bar at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, zIndex: 5,
          background: '#040814',
          pointerEvents: 'none',
        }} />
        {/* Gradient fade above the solid bar */}
        <div style={{
          position: 'absolute', bottom: 50, left: 0, right: 0, height: 50, zIndex: 5,
          background: 'linear-gradient(to bottom, transparent, #040814)',
          pointerEvents: 'none',
        }} />




        {/* REC badge — top left */}
        {listening && (
          <div style={{ position:'absolute', top:14, left:18, display:'flex', alignItems:'center', gap:6, zIndex:3 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#f87171',
              boxShadow:'0 0 8px #f87171', animation:'recDot 1.2s ease-in-out infinite', display:'inline-block' }} />
            <span style={{ fontSize:9, color:'#f87171', fontWeight:800, letterSpacing:'0.12em' }}>REC</span>
          </div>
        )}





        {/* Central mic orb section */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 20px 36px', position:'relative', zIndex:1 }}>

          {/* Orb button with 3 pulse rings */}
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>

            {/* Ring 3 — outermost slow pulse */}
            {listening && (
              <div style={{
                position:'absolute', width:140, height:140, borderRadius:'50%',
                border:`1px solid ${activeColor}20`,
                animation:'neuralPulse3 2.4s ease-in-out infinite',
                pointerEvents:'none',
              }} />
            )}
            {/* Ring 2 — medium pulse */}
            {listening && (
              <div style={{
                position:'absolute', width:110, height:110, borderRadius:'50%',
                border:`1px solid ${activeColor}35`,
                animation:'neuralPulse2 2s ease-in-out infinite 0.3s',
                pointerEvents:'none',
              }} />
            )}
            {/* Ring 1 — inner glow ring */}
            <div style={{
              position:'absolute', width:86, height:86, borderRadius:'50%',
              background: listening ? `radial-gradient(circle, ${activeColor}25 0%, transparent 70%)` : 'transparent',
              transition:'background .5s',
              pointerEvents:'none',
            }} />

            {/* Main orb button */}
            <button
              type="button"
              onClick={isAppendMode && !listening ? onAppend : onToggle}
              style={{
                width:80, height:80, borderRadius:'50%', border:'none', cursor:'pointer',
                position:'relative', zIndex:2,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                background: listening
                  ? `radial-gradient(circle at 40% 35%, ${activeColor}dd, ${activeColor}55)`
                  : processing
                    ? 'radial-gradient(circle at 40% 35%, #a78bfaaa, #6d28d977)'
                    : 'radial-gradient(circle at 40% 35%, rgba(0,229,255,0.12), rgba(0,229,255,0.03))',
                boxShadow: listening
                  ? `0 0 0 3px ${activeColor}90, 0 0 0 10px ${activeColor}20, 0 0 60px ${activeColor}50, 0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`
                  : processing
                    ? '0 0 0 3px rgba(167,139,250,0.5), 0 0 0 8px rgba(167,139,250,0.15), 0 0 40px rgba(167,139,250,0.3), 0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : '0 0 0 2px rgba(0,229,255,0.15), 0 0 0 7px rgba(0,229,255,0.06), 0 0 30px rgba(0,229,255,0.08), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04)',
                transition:'all .4s cubic-bezier(.4,0,.2,1)',
                backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
              }}
            >
              {listening ? (
                <>
                  <span style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:800, color:'#000', lineHeight:1, letterSpacing:'-0.02em' }}>
                    {fmt(seconds)}
                  </span>
                  <span style={{ fontSize:7, color:'rgba(0,0,0,0.7)', fontWeight:800, letterSpacing:'0.1em' }}>STOP</span>
                </>
              ) : processing ? (
                <span style={{ fontSize:22, color:'#a78bfa', lineHeight:1, animation:'recDot 0.8s ease-in-out infinite' }}>⋯</span>
              ) : isAppendMode ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                  <Mic size={18} style={{ color:'#34d399' }} />
                  <span style={{ fontSize:7, color:'#34d399', fontWeight:800, letterSpacing:'0.08em' }}>ADD</span>
                </div>
              ) : (
                <Mic size={24} style={{ color: listening ? '#000' : '#8B949E', transition:'color .3s' }} />
              )}
            </button>
          </div>

          {/* Status text */}
          <p style={{
            fontSize:13, fontWeight:500, letterSpacing:'0.03em',
            color: listening ? activeColor : processing ? '#a78bfa' : 'rgba(255,255,255,0.4)',
            transition:'all .4s', textAlign:'center', lineHeight:1.5,
            textShadow: listening ? `0 0 20px ${activeColor}40` : 'none',
          }}>
            {listening && liveEmotions.length > 0
              ? `Sensing ${liveEmotions[0].emoji} ${liveEmotions[0].label}…`
              : voiceStatusLabel}
          </p>

          {/* Live emotion chips */}
          {listening && liveEmotions.length > 0 && (
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap', justifyContent:'center' }}>
              {liveEmotions.slice(0,4).map(e => (
                <span key={e.label} style={{
                  fontSize:10, fontWeight:700, color:e.color, padding:'3px 10px', borderRadius:99,
                  background:`${e.color}15`, border:`1px solid ${e.color}35`,
                  animation:'fadeChipIn .3s ease',
                }}>
                  {e.emoji} {e.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Transcript panel ── */}
      <div style={{
        width:'100%', minHeight:80, padding:'14px 16px 38px', borderRadius:18,
        background:'rgba(255,255,255,0.03)',
        backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
        border:`1px solid ${listening ? activeColor + '30' : 'rgba(255,255,255,0.06)'}`,
        fontSize:13, lineHeight:1.8, color:'#e5e7eb', position:'relative',
        transition:'border-color .3s, box-shadow .3s',
        boxShadow: listening ? `inset 0 0 30px ${activeColor}08` : 'none',
      }}>
        {journalText || interimText ? (
          <>
            <span>
              {journalText.split(' ').map((word, i) => {
                const clean = word.toLowerCase().replace(/[^a-z]/g, '');
                const match = LIVE_EMOTION_LEXICON[clean];
                return match
                  ? <span key={i} style={{ color:match.color, fontWeight:600, textShadow:`0 0 8px ${match.color}44` }}>{word} </span>
                  : <span key={i}>{word} </span>;
              })}
            </span>
            {interimText && <span style={{ color:'#374151', fontStyle:'italic' }}>{interimText}</span>}
          </>
        ) : (
          <span style={{ color:'#2d3748', fontStyle:'italic', fontSize:12 }}>
            {listening ? 'Listening… speak freely' : 'Your words will appear here as you speak…'}
          </span>
        )}

        {/* Footer bar */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, padding:'6px 16px',
          borderTop:'1px solid rgba(255,255,255,0.04)', borderRadius:'0 0 18px 18px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(0,0,0,0.2)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {listening && (
              <span style={{ width:5, height:5, borderRadius:'50%', background:activeColor,
                boxShadow:`0 0 6px ${activeColor}`, animation:'recDot 1.2s ease-in-out infinite', display:'inline-block' }} />
            )}
            <span style={{ fontSize:10, color:listening ? activeColor : '#374151', fontWeight:listening?700:400, letterSpacing:'0.05em' }}>
              {listening ? `LIVE · ${fmt(seconds)}` : processing ? 'Analyzing…' : isAppendMode ? 'Tap + to add more' : 'IDLE'}
            </span>
          </div>
          <span style={{ fontSize:10, color:'#2d3748' }}>{wordCount} words</span>
        </div>
      </div>

      {/* ── Action buttons ── */}
      {journalText && (
        <div style={{ display:'flex', gap:8, width:'100%' }}>
          {!listening && (
            <button type="button" onClick={onAppend}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 14px', borderRadius:12,
                background:'rgba(0,229,255,0.05)', border:'1px solid rgba(0,229,255,0.18)', color:'#00E5FF', fontSize:12, fontWeight:600, cursor:'pointer',
                transition:'all .2s' }}>
              <Mic size={12} /> Continue recording
            </button>
          )}
          <button type="button" onClick={onClear}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 14px', borderRadius:12,
              background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.18)', color:'#f87171', fontSize:12, fontWeight:500, cursor:'pointer',
              transition:'all .2s' }}>
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      )}

      <textarea value={journalText} onChange={() => {}} required
        style={{ position:'absolute', opacity:0, pointerEvents:'none', width:1, height:1 }} />
    </div>
  );
}




export default function CheckIn({ onNavigate }: CheckInProps) {

  const { submitCheckIn, fetchEntries } = useApp();
  const { triggerCrisis } = useCrisis();

  const [step,         setStep]         = useState(1);
  const [animDir,      setAnimDir]      = useState<'in'|'out'>('in');
  const [journalText,  setJournalText]  = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [stressLevel,  setStressLevel]  = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [energyLevel,  setEnergyLevel]  = useState(5);
  // Micro-assessment answers (null = unanswered)
  const [stressAnswers, setStressAnswers] = useState<(number|null)[]>([null, null, null]);
  const [energyAnswers, setEnergyAnswers] = useState<(number|null)[]>([null, null, null]);
  const [sleepChoice,   setSleepChoice]   = useState<number|null>(null);
  const [selectedTags,   setSelectedTags]   = useState<string[]>([]);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [submitError,    setSubmitError]    = useState('');
  const [hoveredMood,    setHoveredMood]    = useState('');
  const [animPhase,      setAnimPhase]      = useState(0); // for score ring animation

  const [isAppendMode, setIsAppendMode] = useState(false);
  const [voiceContent, setVoiceContent] = useState('');   // ← separate from text input
  const [voiceEmotion, setVoiceEmotion] = useState<{ emotion: string; confidence: number } | null>(null);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);

  const { status, transcript, interimText, audioBlob, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  // Always analyze voice audio when recording stops
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    setIsAnalyzingVoice(true);
    apiAnalyzeVoice(audioBlob)
      .then(res => {
        if (!cancelled && res.voice_emotion && res.voice_emotion !== 'neutral') {
          setVoiceEmotion({ emotion: res.voice_emotion, confidence: res.voice_confidence });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsAnalyzingVoice(false); });
    return () => { cancelled = true; };
  }, [audioBlob]);

  // Voice transcript → voiceContent (always, no mode check)
  useEffect(() => {
    if (!transcript) return;
    if (isAppendMode) {
      setVoiceContent(prev => {
        const cleaned = autoPunctuate(prev);
        return cleaned + (cleaned ? ' ' : '') + transcript;
      });
    } else {
      setVoiceContent(transcript);
    }
  }, [transcript]);

  // Auto-punctuate voiceContent when listening stops
  useEffect(() => {
    if (status === 'idle' && voiceContent) {
      setVoiceContent(prev => autoPunctuate(prev));
      setIsAppendMode(true);
    }
  }, [status]);

  const goStep = (next: number) => {
    setAnimDir('out');
    setTimeout(() => { setStep(next); setAnimDir('in'); }, 220);
  };

  const toggleTag = (t: string) => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const handleSubmit = async () => {
    if (status === 'listening') stopListening();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      // Merge both inputs — text model gets combined content
      const textPart  = journalText.trim();
      const voicePart = voiceContent.trim();
      const combinedText = [textPart, voicePart].filter(Boolean).join(' ');
      const voiceUsed    = !!voicePart || !!audioBlob;

      const entry = await submitCheckIn({
        mood:        selectedMood,
        journalText: combinedText,
        stressLevel,
        sleepQuality,
        energyLevel,
        tags:        selectedTags,
        voiceUsed,
      });

      // Voice emotion score blending: 60% text model + 40% voice model
      // Backend returns: calm, joy, sadness, anger, anxiety, neutral
      const VOICE_SCORE_MAP: Record<string, number> = {
        // UI emotion names
        happy: 10, excited: 8, calm: 6, content: 6, motivated: 8, hopeful: 7, surprised: 2,
        neutral: 0,
        sad: -8, anxious: -10, angry: -10, fear: -12, disgust: -7,
        frustrated: -8, depressed: -14, exhausted: -6,
        // Backend voice model names (must match voice_analyzer.py VOICE_EMOTION_RISK_OFFSET)
        joy: 10, sadness: -8, anger: -10, anxiety: -14,
      };
      let finalScore = entry.riskScore;
      if (voiceEmotion) {
        const emo = voiceEmotion.emotion.toLowerCase();
        const adj = (VOICE_SCORE_MAP[emo] ?? 0) * voiceEmotion.confidence;
        const voiceScore = Math.max(0, Math.min(100, entry.riskScore + adj));
        finalScore = Math.round(entry.riskScore * 0.6 + voiceScore * 0.4);
        console.log(`[Voice Blend] ${emo} adj=${adj.toFixed(1)} text=${entry.riskScore} final=${finalScore}`);
      }

      // Convert entry to AnalysisResult shape for Step 4 display
      const result: AnalysisResult = {
        score:            finalScore,
        risk_level:       (entry.riskLevel ?? 'moderate') as any,
        confidence:       voiceEmotion ? 0.95 : 0.90,
        emotions:         entry.emotionBreakdown ?? { anxiety:0, sadness:0, anger:0, joy:0, hope:0, exhaustion:0 },
        dominant_emotion: entry.dominantEmotion ?? 'neutral',
        sentiment_label:  finalScore >= 60 ? 'positive' : finalScore >= 40 ? 'neutral' : 'negative',
        sentiment_score:  (finalScore - 50) / 50,
        text_depth:       entry.wordCount && entry.wordCount > 40 ? 'deep' : entry.wordCount && entry.wordCount > 20 ? 'reflective' : 'moderate',
        insights:         entry.insights ?? '',
        suggestions:      entry.suggestions ?? [],
        crisis_flag:      entry.crisisFlag ?? false,
        word_count:       entry.wordCount ?? combinedText.split(/\s+/).filter(Boolean).length,
      };
      setAnalysisResult(result);

      // Trigger crisis check
      triggerCrisis(result.score, result.crisis_flag);

      // Refresh Dashboard + History with real server data
      fetchEntries();

      // Animate to Step 4
      setAnimPhase(0);
      goStep(4);
      setTimeout(() => setAnimPhase(1), 400);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Unable to analyze. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const voiceStatusColor = status === 'listening' ? '#00E5FF' : status === 'error' ? '#f87171' : '#8B949E';
  const voiceStatusLabel = { idle: 'Tap mic to start speaking', listening: 'Listening… speak freely', processing: 'Processing…', error: 'Error — try again', unsupported: 'Not supported in this browser' }[status];

  /* ── Upgrade 1: Mood-aware prompts ── */
  const MOOD_PROMPTS: Record<string, string[]> = {
    excellent : ["What's making today amazing?", "What are you most proud of?", "Who made you smile?", "What energy do you want to carry forward?", "What are you grateful for?"],
    good      : ["What went well today?", "What made you feel good?", "What are you looking forward to?", "What's one win from today?", "What made you smile?"],
    okay      : ["How's my energy right now?", "What's on my mind?", "What do I need more of today?", "What's one thing I can improve?", "What challenged me?"],
    low       : ["What's draining my energy?", "What do I need right now?", "What's weighing on me?", "What would make me feel better?", "Who can I reach out to?"],
    struggling: ["What feels hardest right now?", "What's overwhelming me?", "What would help most right now?", "What's one small step I can take?", "What do I need to let go of?"],
  };
  const prompts = MOOD_PROMPTS[selectedMood] ?? ["How's my energy?", "What's weighing on me?", "What made me smile?", "What challenged me?", "What am I grateful for?"];

  const canNext1 = !!selectedMood;
  const canNext2  = stressAnswers.every(a => a !== null) && energyAnswers.every(a => a !== null) && sleepChoice !== null;
  const canSubmit = !!(journalText.trim() || voiceContent.trim());

  // Sync micro-assessment answers → numeric values used by backend
  useEffect(() => {
    if (stressAnswers.every(a => a !== null)) setStressLevel(aggregateStressAnswers(stressAnswers));
    if (energyAnswers.every(a => a !== null)) setEnergyLevel(aggregateEnergyAnswers(energyAnswers));
    if (sleepChoice !== null) setSleepQuality(sleepChoice);
  }, [stressAnswers, energyAnswers, sleepChoice]);

  const stepAnim: React.CSSProperties = {
    opacity   : animDir === 'in' ? 1 : 0,
    transform : animDir === 'in' ? 'translateY(0) scale(1)'  : 'translateY(18px) scale(0.97)',
    filter    : animDir === 'in' ? 'blur(0px)'               : 'blur(4px)',
    transition: 'opacity .40s cubic-bezier(0.22,1,0.36,1), transform .40s cubic-bezier(0.22,1,0.36,1), filter .38s ease',
  };

  return (
    <div className="min-h-screen grid-bg page-enter" style={{ paddingTop: 100, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.18)', marginBottom: 14 }}>
            <Sparkles size={12} style={{ color: '#00E5FF' }} />
            <span style={{ color: '#00E5FF', fontSize: 12, fontWeight: 600 }}>Daily Check-In</span>
          </div>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {step === 1 ? 'How are you feeling?' : step === 2 ? 'How\'s your mind and body?' : 'Share your thoughts'}
          </h1>
          <p style={{ color: '#64748b', fontSize: 13.5 }}>
            {step === 1 ? 'Choose whatever feels most true right now' : step === 2 ? 'Answer honestly — these insights shape your wellness score' : 'Write or speak freely — no judgment here'}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
          {STEPS.map((s, i) => {
            const done    = step > s.num;
            const active  = step === s.num;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Connector line */}
                {i > 0 && <div className="step-connector" style={{ width: 60, height: 2, background: done || active ? 'linear-gradient(90deg,#00E5FF,rgba(0,229,255,0.4))' : 'rgba(255,255,255,0.07)', transition: 'background .4s', marginRight: 0 }} />}
                {/* Step circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="step-circle" style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background : done ? 'linear-gradient(135deg,#00E5FF,#00b4d8)' : active ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                    border     : `2px solid ${done ? '#00E5FF' : active ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow  : active ? '0 0 16px rgba(0,229,255,0.35)' : done ? '0 0 10px rgba(0,229,255,0.2)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition : 'all .35s ease',
                    cursor     : done ? 'pointer' : 'default',
                  }}
                    onClick={() => done && goStep(s.num)}
                  >
                    {done
                      ? <Check size={16} style={{ color: '#000' }} />
                      : <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#00E5FF' : '#374151' }}>{s.num}</span>
                    }
                  </div>
                  <span className="step-label" style={{ fontSize: 11, fontWeight: 600, color: active ? '#00E5FF' : done ? '#64748b' : '#374151', letterSpacing: '0.05em' }}>{s.label.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════
            STEP 1: MOOD CARDS
        ══════════════════════════════════ */}
        {step === 1 && (
          <div style={stepAnim}>
            <div className="mood-grid" style={{ marginBottom: 28 }}>
              {MOODS.map(m => {
                const isSel = selectedMood === m.id;
                const isHov = hoveredMood === m.id;
                return (
                  <button key={m.id} type="button"
                    className="mood-card"
                    onClick={() => setSelectedMood(m.id)}
                    onMouseEnter={() => setHoveredMood(m.id)}
                    onMouseLeave={() => setHoveredMood('')}
                    style={{
                      display       : 'flex',
                      flexDirection : 'column',
                      alignItems    : 'center',
                      gap           : 10,
                      padding       : '22px 8px',
                      borderRadius  : 20,
                      background    : isSel ? m.grad : 'rgba(255,255,255,0.03)',
                      border        : `1.5px solid ${isSel ? m.border : isHov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow     : isSel ? `0 0 28px ${m.glow}, 0 4px 20px rgba(0,0,0,0.3)` : isHov ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
                      cursor        : 'pointer',
                      transition    : 'all .22s cubic-bezier(.4,0,.2,1)',
                      transform     : isSel ? 'scale(1.07) translateY(-4px)' : isHov ? 'scale(1.03) translateY(-2px)' : 'scale(1)',
                      width         : '100%',
                    }}
                  >
                    <span className="mood-emoji" style={{ fontSize: 36, lineHeight: 1, filter: isSel ? `drop-shadow(0 0 8px ${m.glow})` : 'none', transition: 'filter .2s' }}>
                      {m.emoji}
                    </span>
                    <span className="mood-label" style={{ fontSize: 11, fontWeight: 700, color: isSel ? m.text : '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'center', transition: 'color .2s' }}>
                      {m.label}
                    </span>
                    {isSel && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.text, boxShadow: `0 0 8px ${m.glow}` }} />
                    )}
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => goStep(2)} disabled={!canNext1}
              style={{ width: '100%', padding: '15px 24px', borderRadius: 16, border: 'none', cursor: canNext1 ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .25s',
                background   : canNext1 ? 'linear-gradient(135deg,#00E5FF,#00b4d8)' : 'rgba(255,255,255,0.06)',
                color        : canNext1 ? '#000' : '#374151',
                boxShadow    : canNext1 ? '0 0 24px rgba(0,229,255,0.3)' : 'none',
                opacity      : canNext1 ? 1 : 0.5,
              }}>
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════
            STEP 2: VITALS SLIDERS
        ══════════════════════════════════ */}
        {step === 2 && (
          <div style={stepAnim}>

            {/* ── STRESS ── */}
            <div className="dim-card dim-card-1" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.14)', borderRadius: 20, padding: '22px 20px', marginBottom: 12 }}>
              <DimHeader icon="🔥" label="Stress" accent="#f97316" answered={stressAnswers.filter(a=>a!==null).length} total={STRESS_QUESTIONS.length} />
              {STRESS_QUESTIONS.map((q, qi) => (
                <div key={qi} style={{ marginBottom: qi < STRESS_QUESTIONS.length-1 ? 18 : 0 }}>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 9, lineHeight: 1.55, fontWeight: 500 }}>{q.text}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {q.options.map(opt => (
                      <PillOption key={opt.value} label={opt.label} accent="#f97316"
                        selected={stressAnswers[qi] === opt.value}
                        onClick={() => setStressAnswers(prev => { const a=[...prev]; a[qi]=opt.value; return a; })} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── ENERGY ── */}
            <div className="dim-card dim-card-2" style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.14)', borderRadius: 20, padding: '22px 20px', marginBottom: 12 }}>
              <DimHeader icon="⚡" label="Energy" accent="#a78bfa" answered={energyAnswers.filter(a=>a!==null).length} total={ENERGY_QUESTIONS.length} />
              {ENERGY_QUESTIONS.map((q, qi) => (
                <div key={qi} style={{ marginBottom: qi < ENERGY_QUESTIONS.length-1 ? 18 : 0 }}>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 9, lineHeight: 1.55, fontWeight: 500 }}>{q.text}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {q.options.map(opt => (
                      <PillOption key={opt.value} label={opt.label} accent="#a78bfa"
                        selected={energyAnswers[qi] === opt.value}
                        onClick={() => setEnergyAnswers(prev => { const a=[...prev]; a[qi]=opt.value; return a; })} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── SLEEP ── */}
            <div className="dim-card dim-card-3" style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.14)', borderRadius: 20, padding: '22px 20px', marginBottom: 20 }}>
              <DimHeader icon="🌙" label="Sleep" accent="#00E5FF" answered={sleepChoice !== null ? 1 : 0} total={1} />
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 9, lineHeight: 1.55, fontWeight: 500 }}>How many hours did you sleep last night?</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {SLEEP_OPTIONS.map(opt => (
                  <PillOption key={opt.value} label={opt.label} accent="#00E5FF"
                    selected={sleepChoice === opt.value}
                    onClick={() => setSleepChoice(opt.value)} />
                ))}
              </div>
            </div>

            {/* ── Nav ── */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => goStep(1)}
                style={{ flex: '0 0 auto', padding: '15px 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
                <ArrowLeft size={17} />
              </button>
              <button type="button" onClick={() => canNext2 && goStep(3)} disabled={!canNext2}
                style={{ flex: 1, padding: '15px 24px', borderRadius: 16, border: 'none', fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .25s',
                  background : canNext2 ? 'linear-gradient(135deg,#00E5FF,#00b4d8)' : 'rgba(255,255,255,0.06)',
                  color      : canNext2 ? '#000' : '#374151',
                  boxShadow  : canNext2 ? '0 0 24px rgba(0,229,255,0.3)' : 'none',
                  opacity    : canNext2 ? 1 : 0.55,
                  cursor     : canNext2 ? 'pointer' : 'not-allowed',
                }}>
                {canNext2 ? <><span>Continue</span><ArrowRight size={18}/></> : <span>Answer all questions to continue</span>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            STEP 3: REFLECT — TAGS + JOURNAL
        ══════════════════════════════════ */}
        {step === 3 && (
          <div style={stepAnim}>
            {/* Trigger tags */}
            <div style={{ background: 'rgba(4,8,20,0.35)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, position: 'relative', overflow: 'hidden', padding: '20px 22px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>What's affecting you? <span style={{ fontWeight: 400, textTransform: 'none', color: '#374151' }}>(optional)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TAGS.map(t => {
                  const sel = selectedTags.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleTag(t)}
                      style={{ padding: '7px 15px', borderRadius: 99, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all .18s',
                        background : sel ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
                        border     : sel ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        color      : sel ? '#00E5FF' : '#64748b',
                        boxShadow  : sel ? '0 0 10px rgba(0,229,255,0.15)' : 'none',
                        transform  : sel ? 'scale(1.04)' : 'scale(1)',
                      }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DUAL INPUT: Text + Voice - always visible */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 22px', marginBottom: 14 }}>

              {/* Header with input status badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Share your thoughts</p>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, transition: 'all .3s',
                    color: journalText.trim() ? '#00E5FF' : '#374151',
                    background: journalText.trim() ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${journalText.trim() ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                    {'📝'} Text {journalText.trim() ? '✓' : ''}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, transition: 'all .3s',
                    color: voiceContent.trim() ? '#a78bfa' : '#374151',
                    background: voiceContent.trim() ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${voiceContent.trim() ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                    {'🎙️'} Voice {voiceContent.trim() ? '✓' : ''}
                  </span>
                  {journalText.trim() && voiceContent.trim() && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
                      {'⚡'} Combined
                    </span>
                  )}
                </div>
              </div>

              {/* Section 1: Written Reflection */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Type size={11} style={{ color: '#00E5FF' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#00E5FF', letterSpacing: '0.08em' }}>WRITTEN REFLECTION</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={journalText}
                    onChange={e => setJournalText(e.target.value)}
                    onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.max(100, el.scrollHeight) + 'px'; }}
                    placeholder={
                      selectedMood === 'struggling' ? "It's okay to be honest. What's going on?..."
                      : selectedMood === 'excellent' ? "Tell me what's making today so great..."
                      : selectedMood === 'low' ? "No judgment here. What's on your mind?..."
                      : "Write freely… What's on your mind?"
                    }
                    className="input-dark"
                    style={{ width: '100%', padding: '12px 12px 36px', borderRadius: 12, fontSize: 13, lineHeight: 1.8, resize: 'none', overflow: 'hidden', minHeight: 100, boxSizing: 'border-box', transition: 'border-color .3s',
                      borderColor: journalText.length > 10 ? 'rgba(0,229,255,0.25)' : undefined }}
                  />
                  <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
                    {(() => {
                      const words = journalText.trim().split(/\s+/).filter(Boolean).length;
                      const col = words < 10 ? '#374151' : words < 20 ? '#fbbf24' : words < 40 ? '#34d399' : '#00E5FF';
                      return (<>
                        <div style={{ flex: 1, height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100,(words/40)*100)}%`, height: '100%', borderRadius: 99, background: col, transition: 'width .3s,background .3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: col, whiteSpace: 'nowrap' }}>{words}w</span>
                      </>);
                    })()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {prompts.slice(0,4).map((p,i) => (
                    <button key={i} type="button" onClick={() => setJournalText(t => t + (t ? ' ' : '') + p + ' ')}
                      style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .18s', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(0,229,255,0.08)'; el.style.color='#00E5FF'; el.style.borderColor='rgba(0,229,255,0.2)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(255,255,255,0.04)'; el.style.color='#64748b'; el.style.borderColor='rgba(255,255,255,0.07)'; }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,rgba(167,139,250,0.25))' }} />
                <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.06em' }}>+ ADD VOICE NOTE</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(167,139,250,0.25),transparent)' }} />
              </div>

              {/* Section 2: Voice Note */}
              {isSupported ? (
                <>
                  <div style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(167,139,250,0.05)', border: `1px solid ${status==='listening'?'rgba(167,139,250,0.35)':'rgba(167,139,250,0.12)'}`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color .3s' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, transition: 'all .3s', background: status==='listening'?'#a78bfa':status==='error'?'#f87171':'#374151', boxShadow: status==='listening'?'0 0 8px #a78bfa':'none' }} />
                    <p style={{ color: '#64748b', fontSize: 12, flex: 1 }}>
                      <strong style={{ color: status==='listening'?'#a78bfa':status==='error'?'#f87171':'#64748b' }}>{status}</strong>
                      {status==='idle' && !voiceContent && ' — Tap mic orb to record'}
                      {status==='listening' && ' — Speak now, tap orb to stop'}
                      {isAnalyzingVoice && <span style={{ color:'#a78bfa', marginLeft:8 }}>{'·'} Analyzing voice{'…'}</span>}
                      {voiceEmotion && !isAnalyzingVoice && (
                        <span style={{ color:'#a78bfa', marginLeft:8 }}>{'·'} Voice: <strong>{voiceEmotion.emotion}</strong> ({Math.round(voiceEmotion.confidence*100)}%)</span>
                      )}
                    </p>
                  </div>
                  {(() => {
                    const allVoiceText = voiceContent + ' ' + interimText;
                    const liveEmotions = detectLiveEmotions(allVoiceText);
                    const liveEmoColor = status==='listening' ? dominantOrbColor(liveEmotions) : null;
                    return (
                      <SiriOrb
                        status={status}
                        onToggle={() => status==='listening' ? stopListening() : startListening()}
                        onAppend={() => { resetTranscript(); startListening(); }}
                        isAppendMode={isAppendMode}
                        journalText={voiceContent}
                        interimText={interimText}
                        onClear={() => { stopListening(); resetTranscript(); setVoiceContent(''); setIsAppendMode(false); setVoiceEmotion(null); }}
                        voiceStatusLabel={voiceStatusLabel}
                        emotionColor={liveEmoColor}
                      />
                    );
                  })()}
                </>
              ) : (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <p style={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>{'⚠️'} Voice not supported — use Chrome or Edge</p>
                </div>
              )}

              {/* Combined analysis indicator */}
              {journalText.trim() && voiceContent.trim() && (
                <div style={{ marginTop: 12, padding: '9px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{'⚡'}</span>
                  <p style={{ fontSize: 12, color: '#34d399', lineHeight: 1.5 }}>
                    <strong>Combined analysis active</strong> — Score from text model (60%) + voice emotion model (40%).
                  </p>
                </div>
              )}
            </div>
            <div style={{ borderRadius: 14, padding: '11px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', marginBottom: 14 }}>
              <Lock size={13} style={{ color: '#00E5FF', marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.6 }}>
                <strong style={{ color: '#00E5FF' }}>Privacy protected.</strong> Voice audio is processed entirely on your device — never uploaded by MindPulse.
              </p>
            </div>

            {/* Submit error */}
            {submitError && (
              <div style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                <span>{submitError}</span>
                <button type="button" onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => goStep(2)}
                style={{ flex: '0 0 auto', padding: '15px 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
                <ArrowLeft size={17} />
              </button>

              {/* Upgrade 6: Animated Submit Button */}
              <button type="button" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
                onMouseEnter={e => { if (canSubmit && !isSubmitting) { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 0 40px rgba(0,229,255,0.55)'; el.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = canSubmit ? '0 0 24px rgba(0,229,255,0.3)' : 'none'; el.style.transform = 'none'; }}
                style={{ flex: 1, padding: '15px 24px', borderRadius: 16, border: 'none',
                  cursor    : canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
                  fontSize  : 15, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
                  display   : 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .28s cubic-bezier(.4,0,.2,1)',
                  background: canSubmit && !isSubmitting
                    ? 'linear-gradient(135deg,#00E5FF 0%,#0099cc 50%,#00E5FF 100%)'
                    : 'rgba(255,255,255,0.05)',
                  backgroundSize: '200% 100%',
                  color     : canSubmit && !isSubmitting ? '#000' : '#374151',
                  boxShadow : canSubmit && !isSubmitting ? '0 0 24px rgba(0,229,255,0.3)' : 'none',
                  opacity   : canSubmit && !isSubmitting ? 1 : 0.45,
                  position  : 'relative', overflow: 'hidden',
                }}>
                {/* Shimmer overlay */}
                {canSubmit && !isSubmitting && (
                  <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)', backgroundSize: '200% 100%', animation: 'btnShimmer 2.4s linear infinite', borderRadius: 16, pointerEvents: 'none' }} />
                )}
                {isSubmitting ? (
                  <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle opacity=".25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path opacity=".75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Analyzing with AI…</>
                ) : canSubmit ? (
                  <>Analyze with AI <Send size={15} /></>
                ) : (
                  <span style={{ fontSize: 13 }}>
                    {!journalText.trim() ? '✏ï¸ Write at least a few words to continue' : 'Complete the form to continue'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ STEP 4 — RESULTS SCREEN ══ */}
      {step === 4 && analysisResult && (() => {
        const r = analysisResult;

        // ── Score interpretation ──────────────────────────────────────────
        // Our wellness score: 70-100 = doing well (Low Risk tier)
        //                     45-69  = moderate stress (Medium Risk tier)
        //                     0-44   = high distress (High Risk tier)
        const tier = r.score >= 70 ? 'low' : r.score >= 45 ? 'medium' : 'high';

        const TIERS = {
          low: {
            icon:       '✅',
            label:      'Low Risk',
            sublabel:   'You are doing well',
            scoreRange: '70 – 100',
            color:      '#34d399',
            glow:       'rgba(52,211,153,0.35)',
            bg:         'rgba(52,211,153,0.08)',
            border:     'rgba(52,211,153,0.25)',
            actions: [
              'Continue your daily mindfulness practice and mood journaling.',
              'Explore wellness articles to maintain your positive momentum.',
              'Share your good day with someone you care about.',
            ],
          },
          medium: {
            icon:       '⚠ï¸',
            label:      'Medium Risk',
            sublabel:   'Stress detected — take action',
            scoreRange: '45 – 69',
            color:      '#fbbf24',
            glow:       'rgba(251,191,36,0.35)',
            bg:         'rgba(251,191,36,0.08)',
            border:     'rgba(251,191,36,0.25)',
            actions: [
              'Try a 5-minute guided breathing exercise right now.',
              'Schedule more frequent check-ins this week to track trends.',
              'Reach out to a trusted friend or family member today.',
            ],
          },
          high: {
            icon:       '🚨',
            label:      'High Risk',
            sublabel:   'Immediate support recommended',
            scoreRange: '0 – 44',
            color:      '#f87171',
            glow:       'rgba(248,113,113,0.35)',
            bg:         'rgba(248,113,113,0.08)',
            border:     'rgba(248,113,113,0.35)',
            actions: [
              'Call iCall (9152987821) — free, confidential mental health support.',
              'Contact Vandrevala Foundation Helpline: 1860-2662-345 (24/7).',
              'Find the nearest mental health clinic at nimhans.ac.in or icloud.nimhans.ac.in.',
            ],
          },
        };

        const t          = TIERS[tier];
        const emotions   = Object.entries(r.emotions) as [string, number][];
        const emoColors: Record<string, string> = {
          anxiety:'#f87171', sadness:'#a78bfa', anger:'#f97316',
          joy:'#34d399', hope:'#00E5FF', exhaustion:'#fbbf24',
        };
        const R2 = 68; const CX2 = 90; const CY2 = 90; const SW2 = 10;
        const circumference = 2 * Math.PI * R2;
        const dashOffset    = circumference - (circumference * (animPhase === 1 ? r.score / 100 : 0));

        return (
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 16px 48px', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: 6 }}>Analysis Complete</div>
              <h2 style={{ fontFamily:'Sora,sans-serif', fontSize: 24, fontWeight: 800, color:'#fff', margin: 0 }}>Your Wellness Report</h2>
            </div>

            {/* Score Ring */}
            <div style={{ position:'relative', width:180, height:180, marginBottom: 16 }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx={CX2} cy={CY2} r={R2} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW2} />
                <circle cx={CX2} cy={CY2} r={R2} fill="none"
                  stroke={t.color}
                  strokeWidth={SW2}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${CX2} ${CY2})`}
                  style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 10px ${t.glow})` }}
                />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize: 42, fontWeight: 800, color: t.color, lineHeight: 1 }}>{r.score}</div>
                <div style={{ fontSize: 11, color:'#64748b', marginTop: 3 }}>/ 100</div>
              </div>
            </div>

            {/* Tier Badge */}
            <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'8px 22px', borderRadius: 99, background: t.bg, border: `1px solid ${t.border}`, marginBottom: 28 }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: t.color }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t.sublabel}</div>
              </div>
            </div>

            {/* Tier-Based Intervention Card */}
            <div style={{ borderRadius: 20, padding: '22px 24px', width: '100%', maxWidth: 480, marginBottom: 18, background: t.bg, border: `1px solid ${t.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: t.color }}>{t.label} — Intervention Plan</div>
                  <div style={{ fontSize: 11, color:'#64748b' }}>Score range: {t.scoreRange}</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
                {t.actions.map((action, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 8, background: `${t.color}18`, border:`1px solid ${t.color}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: t.color }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: 13, color:'#cbd5e1', margin: 0, lineHeight: 1.65 }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Scale Visual (3 tiers) */}
            <div style={{ width:'100%', maxWidth: 480, marginBottom: 18, display:'flex', gap: 8 }}>
              {(['low','medium','high'] as const).map((lvl) => {
                const td = TIERS[lvl];
                const isActive = tier === lvl;
                return (
                  <div key={lvl} style={{ flex: 1, borderRadius: 14, padding:'12px 10px', textAlign:'center', border: `1px solid ${isActive ? td.border : 'rgba(255,255,255,0.06)'}`, background: isActive ? td.bg : 'rgba(255,255,255,0.02)', transition:'all .3s' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{td.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? td.color : '#374151' }}>{td.label}</div>
                    <div style={{ fontSize: 10, color:'#374151', marginTop: 2 }}>{td.scoreRange}</div>
                  </div>
                );
              })}
            </div>

            {/* Emotions Detected */}
            <div className="glass" style={{ borderRadius: 20, padding: '20px 24px', width: '100%', maxWidth: 480, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color:'#374151', textTransform:'uppercase', marginBottom: 14 }}>Emotions Detected</div>
              {emotions.filter(([,v]) => v > 0.05).sort((a,b) => b[1]-a[1]).map(([emotion, value]) => (
                <div key={emotion} style={{ marginBottom: 10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color:'#8B949E', textTransform:'capitalize' }}>{emotion}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: emoColors[emotion] ?? '#fff' }}>{Math.round(value * 100)}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                    <div style={{ width: `${Math.round(value * 100)}%`, height:'100%', borderRadius: 99,
                      background: emoColors[emotion] ?? '#00E5FF',
                      boxShadow: `0 0 6px ${emoColors[emotion] ?? '#00E5FF'}88`,
                      transition:'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
                  </div>
                </div>
              ))}
              {emotions.every(([,v]) => v <= 0.05) && (
                <p style={{ color:'#374151', fontSize: 13 }}>No strong emotions detected in your text.</p>
              )}
            </div>

            {/* AI Insight */}
            <div className="glass" style={{ borderRadius: 20, padding: '20px 24px', width: '100%', maxWidth: 480, marginBottom: 18 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={14} color="#00E5FF" />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color:'#374151', textTransform:'uppercase' }}>AI Insight</span>
              </div>
              <p style={{ fontSize: 13.5, color:'#94a3b8', lineHeight: 1.7, margin: 0 }}>{r.insights}</p>
            </div>

            {/* Crisis Alert */}
            {r.crisis_flag && (
              <div style={{ borderRadius: 16, padding:'18px 20px', marginBottom: 18, width:'100%', maxWidth: 480, background:'rgba(248,113,113,0.08)', border:'2px solid rgba(248,113,113,0.4)' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🆘</span>
                  <span style={{ color:'#f87171', fontWeight: 800, fontSize: 14 }}>Immediate Support Available</span>
                </div>
                <p style={{ color:'#fca5a5', fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  We noticed some deeply concerning words in your entry. You don't have to face this alone.
                  Please call <strong>iCall at 9152987821</strong> or reach out to a trusted person right now.
                </p>
                <a href="tel:9152987821" style={{ display:'inline-flex', alignItems:'center', gap: 6, marginTop: 12, padding:'10px 18px', borderRadius: 12, background:'#f87171', color:'#000', fontWeight: 700, fontSize: 13, textDecoration:'none' }}>
                  📞 Call iCall Now
                </a>
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display:'flex', gap: 12, width:'100%', maxWidth: 480, marginBottom: 16 }}>
              <button onClick={() => { goStep(1); setAnalysisResult(null); }} style={{ flex:1, padding:'13px', borderRadius:14, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#64748b', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                New Check-In
              </button>
              <button onClick={() => onNavigate('dashboard')} style={{ flex:2, padding:'13px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#00E5FF,#0099cc)', color:'#000', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                View Dashboard <ArrowRight size={15} />
              </button>
            </div>

            {/* Confidence footer */}
            <p style={{ fontSize: 11, color:'#1e293b', textAlign:'center' }}>
              Model confidence: {Math.round((r.confidence ?? 0.8) * 100)}% · {r.word_count} words analyzed
            </p>
          </div>
        );
      })()}

      <style>{`
        @keyframes pulseRing  { 0% { transform:scale(1);opacity:1; } 100% { transform:scale(1.5);opacity:0; } }
        @keyframes waveBar    { 0%,100% { height:20%; } 50% { height:90%; } }
        @keyframes recDot     { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.3; transform:scale(0.75); } }
        @keyframes btnShimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        @keyframes fadeChipIn { 0% { opacity:0; transform:scale(0.8) translateY(4px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

