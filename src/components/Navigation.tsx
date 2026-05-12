import { Home, BookOpen, BarChart3, Lightbulb, History, Menu, X, LogOut, UserCircle, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCrisis } from '../context/CrisisContext';
import Logo from './Logo';

interface NavigationProps { currentPage: string; onNavigate: (page: string) => void; }

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { state, logout } = useApp();
  const { showBanner } = useCrisis();
  const [isMenuOpen,  setIsMenuOpen]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hovered,     setHovered]     = useState<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef  = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const navItems = [
    { id: 'home',      label: 'Home',      icon: Home },
    { id: 'checkin',   label: 'Check-In',  icon: BookOpen },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: Lightbulb },
    { id: 'history',   label: 'History',   icon: History },
    { id: 'about',     label: 'About',     icon: Info },
  ];

  // Move sliding indicator to active/hovered item
  const moveIndicator = (id: string) => {
    const btn = btnRefs.current[id];
    const nav = navRef.current;
    if (!btn || !nav) return;
    const btnRect = btn.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    setIndicatorStyle({ left: btnRect.left - navRect.left, width: btnRect.width, opacity: 1 });
  };

  useEffect(() => {
    const id = hovered || currentPage;
    const validIds = navItems.map(n => n.id);
    if (validIds.includes(id)) moveIndicator(id);
    if (!hovered && !validIds.includes(currentPage)) setIndicatorStyle(s => ({ ...s, opacity: 0 }));
  }, [hovered, currentPage]);

  useEffect(() => {
    if (!showProfile) return;
    const fn = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-profile-menu]')) setShowProfile(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showProfile]);

  const handleLogout = () => { logout(); onNavigate('home'); setShowProfile(false); setIsMenuOpen(false); };

  return (
    <div style={{ 
      position: 'fixed', 
      top: showBanner ? 68 : 16, 
      left: '50%', transform: 'translateX(-50%)', 
      zIndex: 1000, width: '96%', maxWidth: 1180,
      transition: 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
    }}>

      {/* ── Main navbar ── */}
      <nav style={{
        background      : 'rgba(8, 10, 16, 0.65)',
        backdropFilter  : 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border          : '1px solid rgba(255,255,255,0.07)',
        borderRadius    : 18,
        boxShadow       : '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition      : 'all .3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 16px' }}>

          {/* Logo */}
          <button
            onClick={() => onNavigate(state.isAuthenticated ? 'dashboard' : 'home')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 10, transition: 'all .2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <Logo size={34} showText={false} />
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#fff' }}>Mind</span>
              <span style={{ background: 'linear-gradient(135deg,#00E5FF,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pulse</span>
            </span>
          </button>

          {/* ── Center pill nav ── */}
          {state.isAuthenticated && (
            <div
              ref={navRef}
              className="hide-mobile"
              style={{ position: 'relative', display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Sliding active indicator */}
              <span style={{
                position   : 'absolute',
                top        : 4,
                left       : indicatorStyle.left + 4,
                width      : indicatorStyle.width - 8 < 0 ? 0 : indicatorStyle.width - 8,
                height     : 'calc(100% - 8px)',
                background : hovered
                  ? 'rgba(255,255,255,0.07)'
                  : 'rgba(0,229,255,0.12)',
                borderRadius: 10,
                boxShadow  : hovered ? 'none' : '0 0 16px rgba(0,229,255,0.15)',
                border     : hovered ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,229,255,0.2)',
                transition : 'left .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1), background .2s, opacity .2s',
                opacity    : indicatorStyle.opacity,
                pointerEvents: 'none',
                zIndex     : 0,
              }} />

              {navItems.map(({ id, label, icon: Icon }) => {
                const active = currentPage === id;
                return (
                  <button
                    key={id}
                    ref={el => { btnRefs.current[id] = el; }}
                    onClick={() => { onNavigate(id); setIsMenuOpen(false); }}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      position   : 'relative',
                      zIndex     : 1,
                      display    : 'flex',
                      alignItems : 'center',
                      gap        : 6,
                      padding    : '7px 13px',
                      borderRadius: 10,
                      background : 'transparent',
                      color      : active ? '#00E5FF' : hovered === id ? '#ffffff' : '#6b7280',
                      border     : 'none',
                      cursor     : 'pointer',
                      fontSize   : 13,
                      fontWeight : active ? 600 : 400,
                      fontFamily : 'DM Sans,sans-serif',
                      whiteSpace : 'nowrap',
                      transition : 'color .2s',
                    }}
                  >
                    <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {state.isAuthenticated ? (
              <>
                {/* Profile button */}
                <div data-profile-menu style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    style={{
                      display    : 'flex',
                      alignItems : 'center',
                      gap        : 8,
                      background : showProfile ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                      border     : '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 12,
                      padding    : '5px 10px 5px 5px',
                      cursor     : 'pointer',
                      transition : 'all .2s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)'}
                  >
                    {/* Glowing avatar ring */}
                    <div style={{
                      width        : 30,
                      height       : 30,
                      borderRadius : '50%',
                      background   : 'linear-gradient(135deg,#00E5FF,#a78bfa)',
                      display      : 'flex',
                      alignItems   : 'center',
                      justifyContent: 'center',
                      fontSize     : 11.5,
                      fontWeight   : 700,
                      color        : '#060b18',
                      fontFamily   : 'Sora,sans-serif',
                      boxShadow    : '0 0 12px rgba(0,229,255,0.35)',
                      flexShrink   : 0,
                    }}>
                      {state.user?.avatarInitials}
                    </div>
                    <span style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hide-mobile">
                      {state.user?.name.split(' ')[0]}
                    </span>
                  </button>

                  {/* Profile dropdown */}
                  {showProfile && (
                    <div style={{
                      position     : 'absolute',
                      top          : 'calc(100% + 8px)',
                      right        : 0,
                      minWidth     : 210,
                      background   : 'rgba(8,10,18,0.97)',
                      border       : '1px solid rgba(255,255,255,0.08)',
                      borderRadius : 16,
                      padding      : 6,
                      zIndex       : 100,
                      backdropFilter: 'blur(24px)',
                      boxShadow    : '0 20px 60px rgba(0,0,0,0.6)',
                    }}>
                      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{state.user?.name}</p>
                        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{state.user?.email}</p>
                      </div>
                      <button onClick={() => { onNavigate('profile'); setShowProfile(false); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, transition: 'all .2s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.06)'; el.style.color = '#fff'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = '#9ca3af'; }}>
                        <UserCircle size={14} /> View Profile
                      </button>
                      <button onClick={handleLogout}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13, transition: 'all .2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.10)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Hamburger — mobile only */}
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="show-mobile"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 7, cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onNavigate('signin')}
                  style={{ padding: '8px 18px', borderRadius: 11, fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', transition: 'all .2s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.3)'; el.style.color = '#fff'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.12)'; el.style.color = '#9ca3af'; }}>
                  Sign In
                </button>
                <button onClick={() => onNavigate('signup')}
                  style={{ padding: '8px 18px', borderRadius: 11, fontSize: 13, background: 'linear-gradient(135deg,#00E5FF,#0099cc)', border: 'none', color: '#000', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', boxShadow: '0 0 20px rgba(0,229,255,0.25)', transition: 'all .2s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 0 30px rgba(0,229,255,0.45)'; el.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 0 20px rgba(0,229,255,0.25)'; el.style.transform = 'none'; }}>
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {isMenuOpen && state.isAuthenticated && (
        <div style={{ marginTop: 8, background: 'rgba(8,10,18,0.97)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(24px)' }}>
          <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = currentPage === id;
              return (
                <button key={id} onClick={() => { onNavigate(id); setIsMenuOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', borderRadius: 11, background: active ? 'rgba(0,229,255,0.08)' : 'transparent', color: active ? '#00E5FF' : '#9ca3af', border: active ? '1px solid rgba(0,229,255,0.15)' : '1px solid transparent', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400 }}>
                  <Icon size={17} /><span>{label}</span>
                </button>
              );
            })}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 11, background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 14 }}>
              <LogOut size={17} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
