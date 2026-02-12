export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  joinDate: string;
  seatNumber?: string;
  lockerNumber?: string; // locker assignment for the member
  shift?: string;
  monthlyFee: number;
  status: 'active' | 'inactive';
  createdAt: string;
  profilePic?: string; // base64 compressed image
  password?: string; // stored for admin to view/edit
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  entryTime: string;
  exitTime?: string;
  duration?: number; // in minutes
}

export interface FeeRecord {
  id: string;
  memberId: string;
  memberName: string;
  periodStart: string; // YYYY-MM-DD format - start of 30 day period
  periodEnd: string; // YYYY-MM-DD format - end of 30 day period
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  receiptNumber?: string;
  createdAt: string;
}

// Keep for backward compatibility
export type DuesRecord = FeeRecord;

export interface Receipt {
  id: string;
  receiptNumber: string;
  memberId: string;
  memberName: string;
  amount: number;
  month: string;
  paidDate: string;
  paymentMethod: 'cash' | 'upi' | 'other';
}

export interface Activity {
  id: string;
  type: 'entry' | 'exit' | 'payment' | 'member_added' | 'member_removed';
  memberId: string;
  memberName: string;
  timestamp: string;
  details?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'emoji' | 'gif';
  roomId: string; // 'group' for group chat or sorted 'memberId1_memberId2' for private
}

export interface ChatRoom {
  id: string;
  type: 'group' | 'private';
  participants?: string[]; // member IDs for private chats
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  recipientId: string; // 'all' for broadcast or specific memberId
  createdAt: string;
  readBy?: { [memberId: string]: boolean };
}

export interface LibrarySettings {
  chatEnabled: boolean;
}

// Study Timer & Goals
export interface StudySession {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  duration: number; // in minutes
  type: 'pomodoro' | 'custom';
  completedAt: string;
}

export interface StudyGoal {
  id: string;
  memberId: string;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  updatedAt: string;
}

// Leaderboard & Streaks
export interface MemberStreak {
  memberId: string;
  currentStreak: number;
  longestStreak: number;
  lastAttendanceDate: string;
  totalDaysPresent: number;
}

// Feedback System
export interface Feedback {
  id: string;
  memberId: string;
  memberName: string;
  type: 'suggestion' | 'complaint' | 'appreciation' | 'other';
  subject: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}
