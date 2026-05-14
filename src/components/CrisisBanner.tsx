import { AlertTriangle, X, Phone, ChevronRight } from 'lucide-react';
import { useCrisis } from '../context/CrisisContext';
import { useApp } from '../context/AppContext';

export default function CrisisBanner() {
  const { crisisLevel, showBanner, openCrisisModal, dismissBanner } = useCrisis();
  const { latestScore } = useApp();

  if (!showBanner || crisisLevel === 'none') return null;

  const isCritical = crisisLevel === 'critical';

  const bannerBg     = isCritical
    ? 'linear-gradient(135deg, rgba(248,113,113,0.18), rgba(239,68,68,0.12))'
    : 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))';
  const borderColor  = isCritical ? 'rgba(248,113,113,0.3)'  : 'rgba(251,191,36,0.25)';
  const accentColor  = isCritical ? '#fca5a5'                : '#fde68a';
  const dimColor     = isCritical ? 'rgba(252,165,165,0.75)' : 'rgba(253,230,138,0.75)';
  const iconBg       = isCritical ? 'rgba(248,113,113,0.2)'  : 'rgba(251,191,36,0.2)';
  const iconColor    = isCritical ? '#f87171'                : '#fbbf24';
  const dismissColor = isCritical ? 'rgba(252,165,165,0.6)'  : 'rgba(253,230,138,0.6)';

  return (
    <div
      className="crisis-banner crisis-banner-enter"
      style={{
        background   : bannerBg,
        borderBottom : `1px solid ${borderColor}`,
      }}
    >
      {/* ── Left: icon + message ── */}
      <div className="crisis-banner-msg" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div
          className={isCritical ? 'alert-pulse' : ''}
          style={{
            width: 32, height: 32, borderRadius: 9,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <AlertTriangle size={16} style={{ color: iconColor }} />
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: 'Sora,sans-serif',
            color: accentColor, marginRight: 6,
            display: 'inline',
          }}>
            {isCritical ? `Risk Score ${latestScore} — High Alert` : `Risk Score ${latestScore} — Stay Mindful`}
          </span>
          <span style={{ fontSize: 12, color: dimColor }}>
            {isCritical
              ? 'We noticed significant distress. Support is available right now.'
              : 'Elevated stress detected. Take a moment to check in with yourself.'}
          </span>
        </div>
      </div>

      {/* ── Right: action buttons ── */}
      <div className="crisis-banner-actions">
        {isCritical && (
          <a
            href="tel:988"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.35)',
              color: '#fca5a5', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', transition: 'all .2s',
              minHeight: 36,
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
            border: `1px solid ${borderColor}`,
            color: accentColor,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
            minHeight: 36,
          }}
        >
          Get Support <ChevronRight size={12} />
        </button>

        {/* Dismiss — ALWAYS accessible; positioned absolutely on mobile via CSS */}
        <button
          className="crisis-banner-dismiss"
          onClick={() => dismissBanner(latestScore)}
          aria-label="Dismiss notification"
          title="Dismiss"
          style={{ color: dismissColor }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
