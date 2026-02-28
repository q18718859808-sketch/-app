export interface Medication {
  id: string;
  name: string; // 药品名称
  dosage: string; // 用量 e.g., "1片"
  timeLabel: string; // e.g., "早上", "中午"
  scheduledTime: string; // e.g., "08:00"
  status: 'pending' | 'taken' | 'skipped';
  instructions?: string; // e.g., "饭后服用"
  stock: number; // 剩余库存
  takenTime?: string; // 实际服药时间 yyyy-MM-dd HH:mm
}

export interface HealthRecord {
  id: string;
  type: 'bloodPressure' | 'bloodSugar' | 'heartRate' | 'symptom';
  value: string; // e.g., "120/80" or "5.5" or "头晕，恶心"
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'danger' | 'info';
}

export interface UserProfile {
  name: string;
  age: number;
  emergencyContact: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export type TabType = 'home' | 'pharmacy' | 'health' | 'profile';