interface LogoProps {
  size?: number;
  showText?: boolean;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function Logo({
  size = 40,
  showText = true,
  glow = true,
  className = '',
  onClick,
}: LogoProps) {
  const textSize = Math.round(size * 0.55);

  return (
    <div
      className={`logo-wrap ${className}`}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Pulse Brain SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: glow ? 'drop-shadow(0 0 7px rgba(0,229,255,0.55))' : undefined }}
      >
        <defs>
          <linearGradient id="brainOutline" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="pulseGrad" x1="8" y1="32" x2="56" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00E5FF" stopOpacity="0" />
            <stop offset="0.2" stopColor="#00E5FF" />
            <stop offset="0.8" stopColor="#00E5FF" />
            <stop offset="1" stopColor="#00E5FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="neckGrad" x1="22" y1="46" x2="42" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0.4" />
          </linearGradient>
          <filter id="pulseGlow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Brain outline */}
        <path
          d="M32 7
             C 24 7, 17 11, 13 17
             C 9 22, 8 27, 9 32
             C 10 37, 13 41, 17 44
             C 20 46.5, 22 47, 22 50
             L 22 56
             C 22 57.1 22.9 58 24 58
             L 40 58
             C 41.1 58 42 57.1 42 56
             L 42 50
             C 42 47, 44 46.5, 47 44
             C 51 41, 54 37, 55 32
             C 56 27, 55 22, 51 17
             C 47 11, 40 7, 32 7 Z"
          stroke="url(#brainOutline)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Brain crease */}
        <path d="M32 10 C 32 20, 32 44, 32 58" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />

        {/* Left hemisphere folds */}
        <path d="M14 22 C 18 20, 22 24, 20 28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M11 30 C 14 28, 18 32, 15 36" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Right hemisphere folds */}
        <path d="M50 22 C 46 20, 42 24, 44 28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M53 30 C 50 28, 46 32, 49 36" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* ECG / Pulse line */}
        <path
          d="M8 32 L18 32 L21 23 L28 44 L32 28 L36 36 L39 32 L56 32"
          stroke="url(#pulseGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#pulseGlow)"
        />

        {/* Pulse endpoint dot */}
        <circle cx="56" cy="32" r="2.2" fill="#00E5FF" opacity="0.9" />
      </svg>

      {/* Text */}
      {showText && (
        <span
          style={{
            fontFamily: 'Sora,sans-serif',
            fontWeight: 700,
            fontSize: textSize,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Mind</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #00E5FF, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Pulse
          </span>
        </span>
      )}
    </div>
  );
}
