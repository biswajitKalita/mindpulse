import { Brain, Shield, TrendingUp, Heart, Code2, Database, Cpu, Users, BookOpen } from 'lucide-react';

interface AboutProps { onNavigate: (page: string) => void; }

export default function About({ onNavigate }: AboutProps) {
  const team = [
    { name: 'Biswajit Kalita', role: 'AI/ML Engineer',       desc: 'Responsible for designing, training, and deploying LSTM & BERT models. Developed the mental health risk score computation algorithm.', emoji: '🧠', color: '#00E5FF', gradient: 'rgba(0,229,255,0.08)' },
    { name: 'Rishi Das',       role: 'Backend Developer',     desc: 'Built the Flask/FastAPI backend, REST API endpoints, and integrated the ML models with the user-facing application.', emoji: '⚙️', color: '#f472b6', gradient: 'rgba(244,114,182,0.08)' },
    { name: 'Ashik Ikbal',     role: 'Frontend Designer',     desc: 'Designed and implemented the complete React + TypeScript UI/UX. Responsible for all visual design, animations, and user experience.', emoji: '🎨', color: '#fbbf24', gradient: 'rgba(251,191,36,0.08)' },
    { name: 'Saidur Rahman',    role: 'Voice Research Lead',   desc: 'Researched voice-based emotion detection and feature extraction. Explored prosodic and acoustic features for mental health analysis.', emoji: '🎙️', color: '#34d399', gradient: 'rgba(52,211,153,0.08)' },
    { name: 'Mumon',           role: 'Data & Ethics Lead',    desc: 'Managed dataset collection, data preprocessing, and ensured ethical AI compliance. Oversaw privacy and consent frameworks.', emoji: '📊', color: '#7C3AED', gradient: 'rgba(124,58,237,0.08)' },
    { name: 'Jeuti',           role: 'Research & Documentation', desc: 'Authored technical reports, research documentation, and presentation materials. Coordinated interdisciplinary communication.', emoji: '📝', color: '#00E5FF', gradient: 'rgba(0,229,255,0.08)' },
  ];

  const mlTechniques = [
    { title: 'Sentiment Analysis',        desc: 'LSTM & BERT-based NLP models analyze emotional sentiment in journal text.', icon: Brain, color: '#00E5FF' },
    { title: 'Emotion Detection',         desc: 'Transformer-based models classify emotions like Anxious, Stressed, Calm from text.', icon: Heart, color: '#f472b6' },
    { title: 'Behavioral Anomaly Detection', desc: 'Isolation Forest algorithm detects unusual behavioral patterns over time.', icon: TrendingUp, color: '#fbbf24' },
    { title: 'Ensemble Risk Prediction',  desc: 'Final risk score (0-100) computed via ensemble of multiple ML predictions.', icon: Shield, color: '#7C3AED' },
  ];

  const techStack = [
    { cat: 'Frontend',   items: ['React 18', 'TypeScript', 'Vite', 'Vanilla CSS', 'Recharts', 'Lucide Icons'], icon: Code2,    color: '#00E5FF' },
    { cat: 'Backend',    items: ['Python 3.10', 'FastAPI', 'Uvicorn', 'JWT Auth', 'PBKDF2 Hashing'], icon: Cpu,      color: '#f472b6' },
    { cat: 'AI / ML',   items: ['scikit-learn 1.7', 'ONNX Runtime', 'CNN-BiLSTM Voice Model', 'Tri-Model Ensemble NLP', 'librosa', 'NumPy'], icon: Brain,    color: '#fbbf24' },
    { cat: 'Database',   items: ['MongoDB Atlas', 'PyMongo', 'SQLite (local dev)'], icon: Database, color: '#7C3AED' },
    { cat: 'Deployment', items: ['Render (backend)', 'Vercel (frontend)', 'GitHub CI/CD', 'ONNX IR v7'], icon: Users,    color: '#34d399' },
  ];

  return (
    <div className="min-h-screen grid-bg page-enter px-4" style={{ paddingTop: 100, paddingBottom: 40 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 14, letterSpacing: '-0.02em' }}>About MindPulse</h1>
          <p style={{ color: '#8B949E', maxWidth: 560, margin: '0 auto', fontSize: 15, lineHeight: 1.7 }}>
            An AI-Based Early Warning &amp; Intervention System for Mental Health Crisis — built to detect emotional distress before it becomes a crisis.
          </p>
        </div>

        {/* Problem & Solution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
          <div className="glass" style={{ borderRadius: 24, padding: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>😔</div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#f87171', marginBottom: 12 }}>The Problem</h3>
            <p style={{ fontSize: '0.9rem', color: '#8B949E', lineHeight: 1.7 }}>
              Mental health deterioration among students and young professionals often goes undetected until it reaches a crisis point. Existing support systems rely on self-reported questionnaires and manual counseling — reactive, not proactive.
            </p>
            <ul style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Early symptoms are ignored', 'Stigma prevents help-seeking', 'Reactive rather than proactive systems', 'Lack of continuous monitoring'].map(p => (
                <li key={p} style={{ fontSize: '0.82rem', color: '#8B949E', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#f87171' }}>→</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass" style={{ borderRadius: 24, padding: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>🧠</div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#00E5FF', marginBottom: 12 }}>Our Solution</h3>
            <p style={{ fontSize: '0.9rem', color: '#8B949E', lineHeight: 1.7 }}>
              MindPulse uses AI and NLP to continuously analyze user-provided text and voice inputs, detecting subtle emotional changes over time and generating a mental health risk score with personalized preventive recommendations.
            </p>
            <ul style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Proactive early detection', 'LSTM + BERT sentiment analysis', 'Real-time risk score (0–100)', 'Personalized intervention suggestions'].map(p => (
                <li key={p} style={{ fontSize: '0.82rem', color: '#8B949E', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#00E5FF' }}>✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ML Techniques */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: '#00E5FF', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>MACHINE LEARNING</p>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>ML Techniques Used</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {mlTechniques.map(({ title, desc, icon: Icon, color }) => (
              <div key={title} className="glass card-lift" style={{ borderRadius: 20, padding: '22px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}15`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={22} style={{ color, filter: `drop-shadow(0 0 6px ${color}60)` }} />
                </div>
                <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: '0.82rem', color: '#8B949E', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: '#00E5FF', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>ARCHITECTURE</p>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Technology Stack</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            {techStack.map(({ cat, items, icon: Icon, color }) => (
              <div key={cat} className="glass" style={{ borderRadius: 20, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>{cat}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: '#8B949E' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: '#00E5FF', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>THE TEAM</p>
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Meet the Builders</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }} className="stagger">
            {team.map(({ name, role, desc, emoji, color, gradient }) => (
              <div key={name} className="glass card-lift" style={{ borderRadius: 20, padding: '22px 22px', display: 'flex', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: gradient, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 3 }}>{name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 8 }}>{role}</div>
                  <div style={{ fontSize: '0.8rem', color: '#8B949E', lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ethical Considerations */}
        <div className="glass" style={{ borderRadius: 24, padding: '32px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Shield size={22} style={{ color: '#00E5FF' }} />
            <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>Ethical Considerations</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {[
              { title: 'No Medical Diagnosis', desc: 'MindPulse acts as a decision-support tool only, not a licensed medical product.', icon: '🏥' },
              { title: 'Informed Consent', desc: 'User data is collected only with explicit consent and full transparency.', icon: '✅' },
              { title: 'Privacy by Design', desc: 'Voice audio never leaves the device. All data stored locally with encryption.', icon: '🔐' },
              { title: 'Explainable AI', desc: 'Predictions are transparent and users can understand the basis of their risk score.', icon: '🔍' },
            ].map(({ title, desc, icon }) => (
              <div key={title} style={{ display: 'flex', gap: 12, padding: '14px', borderRadius: 14, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>{title}</p>
                  <p style={{ fontSize: '0.8rem', color: '#8B949E', lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
