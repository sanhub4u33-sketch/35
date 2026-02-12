import { useState, useEffect } from 'react';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Member, AttendanceRecord, FeeRecord, Activity } from '@/types/library';
import { addDays, format, differenceInDays, isAfter, parseISO } from 'date-fns';

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const membersRef = ref(database, 'members');
    const unsubscribe = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const membersList = Object.entries(data).map(([id, member]) => ({
          id,
          ...(member as Omit<Member, 'id'>),
        }));
        setMembers(membersList);
      } else {
        setMembers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addMember = async (member: Omit<Member, 'id' | 'createdAt'>) => {
    const membersRef = ref(database, 'members');
    const newMemberRef = push(membersRef);
    await set(newMemberRef, {
      ...member,
      createdAt: new Date().toISOString(),
    });
    
    // Add activity
    await addActivity({
      type: 'member_added',
      memberId: newMemberRef.key!,
      memberName: member.name,
      timestamp: new Date().toISOString(),
      details: `New member ${member.name} added`,
    });
    
    return newMemberRef.key;
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    const memberRef = ref(database, `members/${id}`);
    await update(memberRef, updates);
  };

  const deleteMember = async (id: string, memberName: string) => {
    const memberRef = ref(database, `members/${id}`);
    await remove(memberRef);
    
    await addActivity({
      type: 'member_removed',
      memberId: id,
      memberName: memberName,
      timestamp: new Date().toISOString(),
      details: `Member ${memberName} removed`,
    });
  };

  return { members, loading, addMember, updateMember, deleteMember };
};

export const useAttendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const attendanceRef = ref(database, 'attendance');
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const attendanceList = Object.entries(data).map(([id, record]) => ({
          id,
          ...(record as Omit<AttendanceRecord, 'id'>),
        }));
        setAttendance(attendanceList.sort((a, b) => 
          new Date(b.date + ' ' + b.entryTime).getTime() - new Date(a.date + ' ' + a.entryTime).getTime()
        ));
      } else {
        setAttendance([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markEntry = async (memberId: string, memberName: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
    
    const attendanceRef = ref(database, 'attendance');
    const newAttendanceRef = push(attendanceRef);
    await set(newAttendanceRef, {
      memberId,
      memberName,
      date: today,
      entryTime: now,
    });
    
    await addActivity({
      type: 'entry',
      memberId,
      memberName,
      timestamp: new Date().toISOString(),
      details: `${memberName} entered the library`,
    });
    
    return newAttendanceRef.key;
  };

  const markExit = async (attendanceId: string, memberId: string, memberName: string, entryTime: string) => {
    const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const entryDate = new Date();
    const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
    entryDate.setHours(entryHours, entryMinutes, 0);
    
    const exitDate = new Date();
    const [exitHours, exitMinutes] = now.split(':').map(Number);
    exitDate.setHours(exitHours, exitMinutes, 0);
    
    const duration = Math.round((exitDate.getTime() - entryDate.getTime()) / (1000 * 60));
    
    const attendanceRecordRef = ref(database, `attendance/${attendanceId}`);
    await update(attendanceRecordRef, {
      exitTime: now,
      duration: Math.max(0, duration),
    });
    
    await addActivity({
      type: 'exit',
      memberId,
      memberName,
      timestamp: new Date().toISOString(),
      details: `${memberName} left the library (Duration: ${Math.max(0, duration)} mins)`,
    });
  };

  const getTodayAttendance = () => {
    // Use local date format to ensure correct timezone comparison
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return attendance.filter(record => record.date === today);
  };

  const getMemberAttendance = (memberId: string) => {
    return attendance.filter(record => record.memberId === memberId);
  };

  const getMonthlyAttendance = (year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return attendance.filter(record => record.date.startsWith(monthStr));
  };

  return { 
    attendance, 
    loading, 
    markEntry, 
    markExit, 
    getTodayAttendance, 
    getMemberAttendance,
    getMonthlyAttendance 
  };
};

export const useDues = () => {
  const [dues, setDues] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const duesRef = ref(database, 'dues');
    const unsubscribe = onValue(duesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const duesList = Object.entries(data).map(([id, record]) => ({
          id,
          ...(record as Omit<FeeRecord, 'id'>),
        }));
        // Sort by paid date descending (most recent first)
        setDues(duesList.sort((a, b) => 
          new Date(b.paidDate || b.createdAt).getTime() - new Date(a.paidDate || a.createdAt).getTime()
        ));
      } else {
        setDues([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Record a new manual payment entry
  const recordPayment = async (payment: {
    memberId: string;
    memberName: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    paymentDate?: string; // Optional custom payment date in YYYY-MM-DD format
  }) => {
    const receiptNumber = `RCP-${Date.now()}`;
    const now = new Date().toISOString();
    // Use custom payment date if provided, otherwise use current date/time
    const paidDate = payment.paymentDate 
      ? new Date(payment.paymentDate + 'T12:00:00').toISOString() 
      : now;
    
    const duesRef = ref(database, 'dues');
    const newDueRef = push(duesRef);
    await set(newDueRef, {
      memberId: payment.memberId,
      memberName: payment.memberName,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      amount: payment.amount,
      dueDate: payment.periodEnd,
      status: 'paid',
      paidDate,
      receiptNumber,
      createdAt: now,
    });
    
    await addActivity({
      type: 'payment',
      memberId: payment.memberId,
      memberName: payment.memberName,
      timestamp: now,
      details: `Payment of ₹${payment.amount} received from ${payment.memberName}`,
    });
    
    return receiptNumber;
  };

  const getMemberDues = (memberId: string) => {
    return dues.filter(due => due.memberId === memberId);
  };

  const deletePayment = async (dueId: string) => {
    const dueRef = ref(database, `dues/${dueId}`);
    await remove(dueRef);
  };

  return { dues, loading, recordPayment, getMemberDues, deletePayment };
};

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activitiesRef = ref(database, 'activities');
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activitiesList = Object.entries(data).map(([id, activity]) => ({
          id,
          ...(activity as Omit<Activity, 'id'>),
        }));
        setActivities(activitiesList.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      } else {
        setActivities([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { activities, loading };
};

const addActivity = async (activity: Omit<Activity, 'id'>) => {
  const activitiesRef = ref(database, 'activities');
  const newActivityRef = push(activitiesRef);
  await set(newActivityRef, activity);
};

export const useCurrentMemberAttendance = (memberId: string) => {
  const [currentSession, setCurrentSession] = useState<AttendanceRecord | null>(null);
  
  useEffect(() => {
    if (!memberId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = ref(database, 'attendance');
    
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const todayRecords = Object.entries(data)
          .map(([id, record]) => ({
            id,
            ...(record as Omit<AttendanceRecord, 'id'>),
          }))
          .filter(record => 
            record.memberId === memberId && 
            record.date === today && 
            !record.exitTime
          );
        
        if (todayRecords.length > 0) {
          setCurrentSession(todayRecords[todayRecords.length - 1]);
        } else {
          setCurrentSession(null);
        }
      }
    });

    return () => unsubscribe();
  }, [memberId]);

  return currentSession;
};
