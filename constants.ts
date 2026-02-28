import { Medication, HealthRecord, UserProfile } from './types';

export const INITIAL_USER: UserProfile = {
  name: "张建国",
  age: 72,
  emergencyContact: "13800138000"
};

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: '1',
    name: '氨氯地平片',
    dosage: '1片',
    timeLabel: '早上',
    scheduledTime: '08:00',
    status: 'pending',
    instructions: '饭后服用',
    stock: 12
  },
  {
    id: '2',
    name: '二甲双胍',
    dosage: '2粒',
    timeLabel: '中午',
    scheduledTime: '12:00',
    status: 'pending',
    instructions: '随餐服用',
    stock: 45
  },
  {
    id: '3',
    name: '阿司匹林',
    dosage: '1片',
    timeLabel: '晚上',
    scheduledTime: '20:00',
    status: 'pending',
    instructions: '睡前服用',
    stock: 5
  }
];

export const INITIAL_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'h1',
    type: 'bloodPressure',
    value: '135/85',
    unit: 'mmHg',
    timestamp: '今天 07:30',
    status: 'normal'
  },
  {
    id: 'h2',
    type: 'bloodSugar',
    value: '6.1',
    unit: 'mmol/L',
    timestamp: '今天 07:35',
    status: 'normal'
  },
  {
    id: 'h3',
    type: 'heartRate',
    value: '78',
    unit: '次/分',
    timestamp: '今天 07:30',
    status: 'normal'
  }
];