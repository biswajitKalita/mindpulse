import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell,
} from 'recharts';

// ── Theme constants ──
const COLORS = {
  teal:   '#00E5FF',
  purple: '#a78bfa',
  green:  '#34d399',
  pink:   '#f472b6',
  amber:  '#fbbf24',
  red:    '#f87171',
  grid:   'rgba(255,255,255,0.06)',
  text:   '#8B949E',
  textDim:'#3d444d',
};

const PALETTE = [COLORS.teal, COLORS.purple, COLORS.green, COLORS.pink, COLORS.amber, COLORS.red];

// ── Shared tooltip style ──
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(10,16,32,0.96)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4, fontFamily: 'Sora,sans-serif' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ fontSize: 13, fontWeight: 600, color: entry.color, fontFamily: 'Sora,sans-serif' }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────
//  RISK TREND — Area/Line chart
// ──────────────────────────────────────────

export function RiskTrendChart({
  data,
  height = 180,
}: {
  data: { day: string; score: number }[];
  height?: number;
}) {
  const gradientId = 'riskGradient';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: COLORS.text }}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: COLORS.textDim }}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          name="Wellness Score"
          stroke={COLORS.teal}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: COLORS.teal, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: COLORS.teal, stroke: '#060b18', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
//  EMOTION RADAR — Spider chart
// ──────────────────────────────────────────

export function EmotionRadarChart({
  data,
  height = 220,
}: {
  data: { emotion: string; value: number }[];
  height?: number;
}) {
  if (data.length < 3) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 12, color: COLORS.textDim }}>Need at least 3 emotions to display</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <PolarGrid stroke={COLORS.grid} />
        <PolarAngleAxis
          dataKey="emotion"
          tick={{ fontSize: 10, fill: COLORS.text }}
        />
        <PolarRadiusAxis
          axisLine={false}
          tick={false}
        />
        <Radar
          name="Emotion"
          dataKey="value"
          stroke={COLORS.purple}
          strokeWidth={2}
          fill={COLORS.purple}
          fillOpacity={0.2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
//  MOOD PIE — Donut chart
// ──────────────────────────────────────────

const MOOD_COLORS: Record<string, string> = {
  great:      COLORS.green,
  good:       COLORS.teal,
  okay:       COLORS.purple,
  low:        COLORS.amber,
  struggling: COLORS.red,
};

export function MoodPieChart({
  data,
  size = 180,
}: {
  data: { mood: string; count: number; label: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 12, color: COLORS.textDim }}>No mood data yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="mood"
            cx="50%"
            cy="50%"
            innerRadius={size / 3.2}
            outerRadius={size / 2.4}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.mood} fill={MOOD_COLORS[entry.mood] ?? COLORS.textDim} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(({ mood, count, label }) => (
          <div key={mood} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: MOOD_COLORS[mood] ?? COLORS.textDim }} />
            <span style={{ fontSize: 12, color: COLORS.text }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>{Math.round((count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
//  WEEKLY BAR — Simple bar chart
// ──────────────────────────────────────────

export function WeeklyBarChart({
  data,
  height = 160,
}: {
  data: { day: string; score: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barSize={24}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: COLORS.text }}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: COLORS.textDim }}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="score"
          name="Wellness Score"
          radius={[6, 6, 0, 0]}
          fill={COLORS.teal}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
