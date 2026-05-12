import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type CrisisLevel = 'none' | 'elevated' | 'critical';

interface CrisisContextValue {
  crisisLevel:       CrisisLevel;
  showModal:         boolean;
  showBanner:        boolean;
  dismissedScore:    number;
  mlScore:           number;          // the real ML score shown in the modal
  triggerCrisis:     (score: number, crisisFlag?: boolean) => void;
  openCrisisModal:   () => void;
  closeCrisisModal:  () => void;
  dismissBanner:     (score: number) => void;
  clearCrisis:       () => void;
}

const CrisisContext = createContext<CrisisContextValue | null>(null);

export function CrisisProvider({ children }: { children: ReactNode }) {
  const [crisisLevel,    setCrisisLevel]    = useState<CrisisLevel>('none');
  const [showModal,      setShowModal]      = useState(false);
  const [showBanner,     setShowBanner]     = useState(false);
  const [dismissedScore, setDismissedScore] = useState(0);
  const [mlScore,        setMlScore]        = useState(0);

  // ── Correct risk mapping for our ML system ────────────────────────────────
  // score 70–100 = LOW RISK    → no crisis
  // score 45–69  = MEDIUM      → no crisis
  // score 21–44  = HIGH        → elevated banner (not auto-modal)
  // score 0–20   = CRISIS      → critical + auto-open modal
  // crisis_flag = true         → always critical regardless of score
  const triggerCrisis = useCallback((score: number, crisisFlag: boolean = false) => {
    setMlScore(score);

    if (crisisFlag || score <= 20) {
      setCrisisLevel('critical');
      if (score !== dismissedScore) {
        setShowModal(true);
        setShowBanner(true);
      }
    } else if (score <= 35) {
      setCrisisLevel('elevated');
      setShowBanner(true);
    } else {
      setCrisisLevel('none');
      setShowBanner(false);
    }
  }, [dismissedScore]);

  const openCrisisModal  = useCallback(() => setShowModal(true), []);
  const closeCrisisModal = useCallback(() => setShowModal(false), []);

  const dismissBanner = useCallback((score: number) => {
    setShowBanner(false);
    setDismissedScore(score);
  }, []);

  const clearCrisis = useCallback(() => {
    setCrisisLevel('none');
    setShowModal(false);
    setShowBanner(false);
  }, []);

  return (
    <CrisisContext.Provider value={{ crisisLevel, showModal, showBanner, dismissedScore, mlScore, triggerCrisis, openCrisisModal, closeCrisisModal, dismissBanner, clearCrisis }}>
      {children}
    </CrisisContext.Provider>
  );
}

export function useCrisis() {
  const ctx = useContext(CrisisContext);
  if (!ctx) throw new Error('useCrisis must be inside CrisisProvider');
  return ctx;
}
