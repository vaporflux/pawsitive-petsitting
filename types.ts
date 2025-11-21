
export enum ActivityType {
  Bathroom = 'Bathroom',
  Feeding = 'Feeding',
}

export type DogColor = 'blue' | 'pink' | 'purple' | 'orange' | 'teal' | 'indigo';

export interface DogConfig {
  name: string;
  color: DogColor;
}

export interface Task {
  id: string;
  dog: string;
  activity: ActivityType;
  completed: boolean;
  timestamp?: number;
}

export interface TimeSlot {
  id: string;
  label: string;
  timeRange: string;
  activities: ActivityType[];
}

export interface DayLog {
  date: string; // ISO Date String YYYY-MM-DD
  photos?: string[]; // Base64 strings
  tasks: Record<string, boolean>; // TaskID -> Completed
  taskTimestamps?: Record<string, number>; // TaskID -> Timestamp (ms)
  comments: Record<string, string>; // DogName -> Comment
  aiSummary?: string;
  
  // Legacy fields for backward compatibility type checking
  morningPhoto?: string | null; 
  eveningPhoto?: string | null;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface EmergencyContacts {
  owner: EmergencyContact; // Renamed from primary
  secondary: EmergencyContact;
  vet: EmergencyContact;
}

export interface SessionMeta {
  id: string;
  sitterName: string;
  startDate: string;
  totalDays: number;
  dogs: DogConfig[];
  emergencyContacts: EmergencyContacts;
  createdAt: number;
}

export interface AppState extends SessionMeta {
  logs: Record<string, DayLog>; // Keyed by date string
}

export const TIME_SLOTS: TimeSlot[] = [
  {
    id: 'morning',
    label: 'Morning Routine',
    timeRange: '7:00 AM - 8:30 AM',
    activities: [ActivityType.Bathroom, ActivityType.Feeding],
  },
  {
    id: 'late_morning',
    label: 'Late Morning Break',
    timeRange: '11:00 AM - 12:30 PM',
    activities: [ActivityType.Bathroom],
  },
  {
    id: 'dinner',
    label: 'Dinner Time',
    timeRange: '5:00 PM - 6:00 PM',
    activities: [ActivityType.Bathroom, ActivityType.Feeding],
  },
  {
    id: 'bedtime',
    label: 'Bedtime Routine',
    timeRange: 'Evening',
    activities: [ActivityType.Bathroom],
  },
];
