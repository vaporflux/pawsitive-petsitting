
export enum DogName {
  Duke = 'Duke',
  Lulu = 'Lulu',
  Molly = 'Molly'
}

export enum ActivityType {
  Bathroom = 'Bathroom',
  Feeding = 'Feeding',
}

export interface Task {
  id: string;
  dog: DogName;
  activity: ActivityType;
  completed: boolean;
  timestamp?: number;
}

export interface TimeSlot {
  id: string;
  label: string;
  timeRange: string;
  activities: ActivityType[]; // Activities applicable to all dogs in this slot
}

export interface DayLog {
  date: string; // ISO Date String YYYY-MM-DD
  morningPhoto?: string | null; // Legacy field
  eveningPhoto?: string | null; // Legacy field
  photos?: string[]; // Base64 strings for multiple photos
  tasks: Record<string, boolean>; // TaskID -> Completed
  comments: Record<DogName, string>;
  aiSummary?: string;
}

export interface AppState {
  sitterName: string;
  startDate: string;
  totalDays: number;
  logs: Record<string, DayLog>; // Keyed by date string
  initialized: boolean;
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
    label: 'Bedtime',
    timeRange: 'Evening',
    activities: [ActivityType.Bathroom],
  },
];

export const DOGS = [DogName.Duke, DogName.Lulu, DogName.Molly];
