import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-fallback">
          <div
            className="glass"
            style={{
              maxWidth: 440,
              width: '100%',
              borderRadius: 28,
              padding: '40px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'rgba(248,113,113,0.12)',
                border: '1px solid rgba(248,113,113,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <AlertTriangle size={28} style={{ color: '#f87171' }} />
            </div>

            <h2
              style={{
                fontFamily: 'Sora,sans-serif',
                fontSize: 20,
                fontWeight: 800,
                color: '#FFFFFF',
                marginBottom: 8,
              }}
            >
              Something went wrong
            </h2>

            <p style={{ fontSize: 13, color: '#8B949E', lineHeight: 1.7, marginBottom: 16 }}>
              MindPulse encountered an unexpected error. Your data is safe — this is a display issue.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.15)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 20,
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px',
                  borderRadius: 12,
                  background: 'rgba(0,229,255,0.12)',
                  border: '1px solid rgba(0,229,255,0.25)',
                  color: '#00E5FF',
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} /> Reload
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8B949E',
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Home size={14} /> Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
