export type MoodType = 'great' | 'good' | 'okay' | 'low' | 'struggling';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface EmotionBreakdown {
  anxiety:    number;  // 0.0–1.0
  sadness:    number;
  anger:      number;
  joy:        number;
  hope:       number;
  exhaustion: number;
}

export interface CheckInEntry {
  id:               string;
  date:             string;           // ISO string
  mood:             MoodType;
  journalText:      string;
  stressLevel:      number;           // 1–10
  sleepQuality:     number;           // 1–10
  tags:             string[];
  emotions:         string[];         // ["Anxious", "Hopeful"] — display labels
  riskScore:        number;           // 0–100 (higher = healthier)
  // Rich ML fields (present when backend is live)
  emotionBreakdown?: EmotionBreakdown;
  dominantEmotion?:  string;
  insights?:         string;
  suggestions?:      string[];
  crisisFlag?:       boolean;
  wordCount?:        number;
  riskLevel?:        string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  joinedDate: string;
}

export interface AppState {
  user: User | null;
  entries: CheckInEntry[];
  isAuthenticated: boolean;
}
