import { Brain, TrendingDown, TrendingUp, AlertTriangle, Lightbulb, Activity, Zap } from 'lucide-react';

interface Entry {
  mood: string;
  riskScore: number;
  journalText: string;
  stressLevel: number;
  sleepQuality: number;
  emotions: string[];
  date: string;
}

interface AIInsightsProps {
  entries: Entry[];
  riskLevel: 'low' | 'moderate' | 'high';
  avgRiskScore: number;
  streakDays: number;
}

export default function AIInsights({ entries, riskLevel, avgRiskScore, streakDays }: AIInsightsProps) {
  if (entries.length === 0) return null;

  const recent = entries.slice(0, 5);
  const latest = entries[0];
  const previous = entries[1];

  // Trend analysis
  const trend = previous
    ? latest.riskScore < previous.riskScore ? 'improving' : latest.riskScore > previous.riskScore ? 'worsening' : 'stable'
    : 'stable';

  const avgStress = recent.reduce((a, e) => a + e.stressLevel, 0) / recent.length;
  const avgSleep  = recent.reduce((a, e) => a + e.sleepQuality, 0) / recent.length;

  // Generate AI insight messages
  const insights: { icon: any; color: string; title: string; msg: string }[] = [];

  // Trend insight
  if (trend === 'improving') {
    insights.push({ icon: TrendingDown, color: '#34d399', title: 'Risk Decreasing', msg: `Your risk score dropped from ${previous?.riskScore} → ${latest.riskScore}. Your coping strategies are working — keep it up!` });
  } else if (trend === 'worsening') {
    insights.push({ icon: TrendingUp, color: '#f87171', title: 'Risk Increasing', msg: `Your risk score rose from ${previous?.riskScore} → ${latest.riskScore}. Consider our breathing exercises or reaching out to someone you trust.` });
  }

  // Sleep insight
  if (avgSleep < 5) {
    insights.push({ icon: AlertTriangle, color: '#fbbf24', title: 'Poor Sleep Detected', msg: `Your average sleep quality is ${avgSleep.toFixed(1)}/10. Poor sleep significantly amplifies stress and emotional reactivity.` });
  } else if (avgSleep >= 8) {
    insights.push({ icon: Zap, color: '#00E5FF', title: 'Excellent Sleep Pattern', msg: `Sleep quality ${avgSleep.toFixed(1)}/10 is great! Quality sleep is your strongest mental health protector.` });
  }

  // Stress insight
  if (avgStress > 7) {
    insights.push({ icon: AlertTriangle, color: '#f87171', title: 'High Stress Pattern', msg: `Average stress level ${avgStress.toFixed(1)}/10 across recent check-ins. Prolonged high stress can impair immune function and emotional regulation.` });
  } else if (avgStress < 4) {
    insights.push({ icon: Activity, color: '#34d399', title: 'Low Stress Levels', msg: `Your average stress is ${avgStress.toFixed(1)}/10 — excellent! Low stress is a key predictor of good mental health.` });
  }

  // Streak insight
  if (streakDays >= 7) {
    insights.push({ icon: Zap, color: '#fbbf24', title: `${streakDays}-Day Streak! 🔥`, msg: 'Consistent check-ins improve detection accuracy by up to 3×. You\'re building a powerful self-awareness habit.' });
  }

  // Mood pattern
  const strugglingCount = recent.filter(e => e.mood === 'struggling').length;
  if (strugglingCount >= 3) {
    insights.push({ icon: AlertTriangle, color: '#f87171', title: 'Recurring Struggle Pattern', msg: `You've reported struggling ${strugglingCount} out of ${recent.length} recent check-ins. This pattern suggests you need additional support — please explore our resources.` });
  }

  // Positive emotion insight
  const allEmotions = entries.slice(0, 3).flatMap(e => e.emotions);
  const positiveEmotions = ['Happy', 'Grateful', 'Calm', 'Hopeful', 'Motivated', 'Content', 'Excited', 'Proud'];
  const posCount = allEmotions.filter(e => positiveEmotions.includes(e)).length;
  if (posCount >= 3 && riskLevel === 'low') {
    insights.push({ icon: Lightbulb, color: '#00E5FF', title: 'Positive Emotional State', msg: 'Our model detects predominantly positive emotions in your recent entries. This is a strong indicator of good psychological resilience.' });
  }

  // Recommendations
  const recommendations: string[] = [];
  if (riskLevel === 'high') {
    recommendations.push('🆘 Reach out to a counselor or trusted person today');
    recommendations.push('🌬️ Try the 4-7-8 breathing technique for immediate calm');
    recommendations.push('📞 Consider calling iCall: 9152987821');
  } else if (riskLevel === 'moderate') {
    recommendations.push('🧘 Practice 10 minutes of mindful breathing daily');
    recommendations.push('📝 Continue journaling — consistency improves insight accuracy');
    recommendations.push('🏃 Light exercise can reduce your stress score by up to 40%');
  } else {
    recommendations.push('✨ Keep your daily check-in streak going');
    recommendations.push('😴 Maintain your sleep schedule for optimal resilience');
    recommendations.push('🌱 Share your wellness strategies with others around you');
  }

  if (insights.length === 0 && entries.length < 3) {
    insights.push({ icon: Brain, color: '#00E5FF', title: 'More Data Needed', msg: 'Complete 3+ check-ins to unlock detailed behavioral pattern analysis and personalized AI insights.' });
  }

  return (
    <div className="glass" style={{ borderRadius: 24, padding: 'clamp(16px,3vw,28px)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Brain size={16} style={{ color: '#00E5FF' }} />
        </div>
        <div>
          <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>AI Behavioral Insights</h2>
          <p style={{ fontSize: 11, color: '#8B949E' }}>Pattern analysis from your {entries.length} check-in{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'rgba(0,229,255,0.1)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)', flexShrink: 0 }}>
          LSTM · BERT
        </span>
      </div>

      {/* Insights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {insights.slice(0, 3).map(({ icon: Icon, color, title, msg }, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, background: `${color}0e`, border: `1px solid ${color}22` }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, fontWeight: 600, color, marginBottom: 3 }}>{title}</p>
              <p style={{ fontSize: 11.5, color: '#8B949E', lineHeight: 1.55 }}>{msg}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#3d444d', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Recommended Actions</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {recommendations.map((r, i) => (
            <p key={i} style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.5 }}>{r}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
