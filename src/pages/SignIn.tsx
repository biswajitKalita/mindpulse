import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';

interface SignInProps { onNavigate: (page: string) => void; }

export default function SignIn({ onNavigate }: SignInProps) {
  const { login } = useApp();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) onNavigate('dashboard');
    else setError(res.error || 'Incorrect email or password.');
  };

  return (
    <div className="min-h-screen grid-bg page-enter flex items-center justify-center px-4 py-10">
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Logo size={48} showText={false} />
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 22, color: '#FFFFFF' }}>
              Mind<span style={{ background: 'linear-gradient(135deg,#00E5FF,#FFFFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pulse</span>
            </span>
          </div>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 26, fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: '#8B949E', fontSize: 14 }}>Sign in to continue your mental health journey</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8">

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#3d444d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#3d444d' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  className="input-dark"
                  style={{ width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, fontSize: 14 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#3d444d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#3d444d' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="input-dark"
                  style={{ width: '100%', paddingLeft: 42, paddingRight: 44, paddingTop: 12, paddingBottom: 12, borderRadius: 12, fontSize: 14 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3d444d' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading
                ? (<><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle opacity=".25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path opacity=".75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Signing in…</>)
                : (<>Sign In <ArrowRight size={16} /></>)
              }
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ color: '#3d444d', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#8B949E' }}>
            Don't have an account?{' '}
            <button onClick={() => onNavigate('signup')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00E5FF', fontWeight: 600, fontSize: 13 }}>
              Sign up free
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3d444d', marginTop: 20, lineHeight: 1.6 }}>
          This system provides preventive support — not medical diagnosis.<br />
          Always consult a professional for clinical advice.
        </p>
      </div>
    </div>
  );
}
