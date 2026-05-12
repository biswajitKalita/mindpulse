import { useEffect, useState } from 'react';
import './Hero.css';

interface HeroProps {
  onNavigate: (page: string) => void;
}

const TYPING_WORDS = ['Always Heard.', 'Always Safe.', 'Always Aware.', 'Always Cared.'];

export default function Hero({ onNavigate }: HeroProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Typewriter loop
  useEffect(() => {
    const word = TYPING_WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length - 1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % TYPING_WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIndex]);

  return (
    <div className="hero-split">


      {/* LEFT: 3D Spline Brain */}
      <div className="spline-container">
        {/* Glow ring behind the model */}
        <div className="model-glow-ring" />

        <iframe
          src="https://my.spline.design/particleaibrain-EucU5NSBA7rsqilQ5Qv3z5pT?hideUI=1&watermark=0&logo=0"
          frameBorder="0"
          allow="autoplay; fullscreen"
          title="MindPulse 3D AI"
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            width: 'calc(100% + 20px)',
            height: 'calc(100% + 120px)',
            border: 'none',
            background: 'transparent',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* RIGHT: Text content */}
      <div className="hero-text-content">

        {/* Headline with typewriter */}
        <h1>
          Your Mind,<br />
          <span className="gradient-text typewriter-word">
            {displayed}
            <span className="cursor-blink">|</span>
          </span>
        </h1>

        {/* Subtext */}
        <p>
          An intelligent early-warning system that detects emotional distress
          before it becomes a crisis — empowering you to act when it matters most.
        </p>

        {/* Stats row */}
        <div className="hero-stats-row">
          {[
            { val: '94%',   label: 'Accuracy' },
            { val: '<5min', label: 'Daily check-in' },
            { val: '0-100', label: 'Risk score' },
          ].map(({ val, label }) => (
            <div key={label} className="hero-stat-pill">
              <span className="stat-val">{val}</span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="btn-group">
          <button onClick={() => onNavigate('signup')} className="hero-btn-primary">
            Get Started Free
            <span className="btn-shine" />
          </button>
          <button onClick={() => onNavigate('signin')} className="btn-secondary">Sign In</button>
        </div>

      </div>

    </div>
  );
}
