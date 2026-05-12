import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp }           from './context/AppContext';
import { CrisisProvider, useCrisis }     from './context/CrisisContext';
import ErrorBoundary                     from './components/ErrorBoundary';
import Navigation       from './components/Navigation';
import CrisisBanner     from './components/CrisisBanner';
import CrisisAlertModal from './components/CrisisAlertModal';
import Landing          from './pages/Landing';
import SignIn           from './pages/SignIn';
import SignUp           from './pages/SignUp';
import Onboarding       from './pages/Onboarding';
import CheckIn          from './pages/CheckIn';
import Dashboard        from './pages/Dashboard';
import Resources        from './pages/Resources';
import History          from './pages/History';
import Profile          from './pages/Profile';
import About            from './pages/About';
import AuroraBackground from './components/AuroraBackground';
import './App.css';

const PROTECTED  = ['checkin','dashboard','resources','history','onboarding','profile'];
const AUTH_PAGES = ['signin','signup'];

function AppInner() {
  const { state }   = useApp();
  const { triggerCrisis, clearCrisis } = useCrisis();
  const [currentPage, setCurrentPage] = useState('home');
  const [visible,     setVisible]     = useState(true);

  const navigate = useCallback((page: string) => {
    if (page === currentPage) return;
    setVisible(false);
    setTimeout(() => {
      setCurrentPage(page);
      setVisible(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 160);
  }, [currentPage]);

  // Auth gate
  useEffect(() => {
    if (!state.isAuthenticated && PROTECTED.includes(currentPage)) setCurrentPage('signin');
    if (state.isAuthenticated && AUTH_PAGES.includes(currentPage))  setCurrentPage('dashboard');
    if (!state.isAuthenticated) clearCrisis();
  }, [state.isAuthenticated, currentPage, clearCrisis]);


  // Trigger crisis check whenever entries change
  useEffect(() => {
    if (state.entries.length > 0 && state.isAuthenticated) {
      triggerCrisis(state.entries[0].riskScore);
    }
  }, [state.entries, state.isAuthenticated]);

  const renderPage = () => {
    if (!state.isAuthenticated && PROTECTED.includes(currentPage)) return <SignIn onNavigate={navigate} />;
    switch (currentPage) {
      case 'home':       return <Landing     onNavigate={navigate} />;
      case 'signin':     return <SignIn      onNavigate={navigate} />;
      case 'signup':     return <SignUp      onNavigate={navigate} />;
      case 'about':      return <About       onNavigate={navigate} />;
      case 'onboarding': return <Onboarding  onNavigate={navigate} />;
      case 'checkin':    return <CheckIn     onNavigate={navigate} />;
      case 'dashboard':  return <Dashboard   onNavigate={navigate} />;
      case 'resources':  return <Resources   onNavigate={navigate} />;
      case 'history':    return <History     onNavigate={navigate} />;
      case 'profile':    return <Profile     onNavigate={navigate} />;
      default:           return <Landing     onNavigate={navigate} />;
    }
  };

      return (
        <>
          {/* Aurora: CSS glows (body::before/after) + canvas wave lines */}
          <AuroraBackground />


          <div style={{ minHeight: '100dvh', background: 'transparent', position: 'relative', zIndex: 1 }}>
            <Navigation currentPage={currentPage} onNavigate={navigate} />
            <CrisisBanner />
            <main style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.16s ease, transform 0.16s ease', position: 'relative', zIndex: 1 }}>
              {renderPage()}
            </main>
            <CrisisAlertModal />
          </div>
        </>
      );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <CrisisProvider>
          <div className="noise-overlay" aria-hidden="true" />
          <AppInner />
        </CrisisProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
