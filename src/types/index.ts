export type EventCategory =
  | 'All'
  | 'Cleanup'
  | 'Donation'
  | 'Plantation'
  | 'Education'
  | 'Community'
  | 'Health';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  date: string;
  displayDate?: string;
  time: string;
  location: string;
  address?: string;
  thumbnail: string;
  creatorEmail: string;
  creatorName: string;
  creatorId: string;
  organizerId?: string;
  capacity?: number;
  joinedUsers: string[];
  whatToBring?: string[];
  impactStatement?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  memberSince: string;
  accountType: 'Standard Volunteer' | 'Community Organizer' | 'Admin';
  lastSignedIn: string;
  timeZone: string;
  token?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}
