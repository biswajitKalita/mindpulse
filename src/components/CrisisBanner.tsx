import { AlertTriangle, X, Phone, ChevronRight } from 'lucide-react';
import { useCrisis } from '../context/CrisisContext';
import { useApp } from '../context/AppContext';

export default function CrisisBanner() {
  const { crisisLevel, showBanner, openCrisisModal, dismissBanner } = useCrisis();
  const { latestScore } = useApp();

  if (!showBanner || crisisLevel === 'none') return null;

  const isCritical = crisisLevel === 'critical';

  return (
    <div
      className="crisis-banner-enter"
      style={{
        background: isCritical
          ? 'linear-gradient(135deg, rgba(248,113,113,0.18), rgba(239,68,68,0.12))'
          : 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))',
        borderBottom: `1px solid ${isCritical ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.25)'}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 999,
      }}
    >
      {/* Left — icon + message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
        <div
          className={isCritical ? 'alert-pulse' : ''}
          style={{
            width: 32, height: 32, borderRadius: 9,
            background: isCritical ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <AlertTriangle size={16} style={{ color: isCritical ? '#f87171' : '#fbbf24' }} />
        </div>
        <div>
          <span
            style={{
              fontSize: 13, fontWeight: 700, fontFamily: 'Sora,sans-serif',
              color: isCritical ? '#fca5a5' : '#fde68a',
              marginRight: 6,
            }}
          >
            {isCritical ? `Risk Score ${latestScore} — High Alert` : `Risk Score ${latestScore} — Stay Mindful`}
          </span>
          <span style={{ fontSize: 12, color: isCritical ? 'rgba(252,165,165,0.75)' : 'rgba(253,230,138,0.75)' }}>
            {isCritical
              ? 'We noticed significant distress. Support is available right now.'
              : 'Elevated stress detected. Take a moment to check in with yourself.'}
          </span>
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isCritical && (
          <a
            href="tel:988"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.35)',
              color: '#fca5a5', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', transition: 'all .2s',
            }}
          >
            <Phone size={12} /> Call 988
          </a>
        )}
        <button
          onClick={openCrisisModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 8,
            background: isCritical ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
            border: `1px solid ${isCritical ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.25)'}`,
            color: isCritical ? '#fca5a5' : '#fde68a',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
          }}
        >
          Get Support <ChevronRight size={12} />
        </button>
        <button
          onClick={() => dismissBanner(latestScore)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: isCritical ? 'rgba(252,165,165,0.5)' : 'rgba(253,230,138,0.5)',
            padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6,
            transition: 'color .2s',
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
