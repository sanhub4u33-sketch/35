export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  joinDate: string;
  seatNumber?: string;
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
