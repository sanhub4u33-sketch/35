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
    const today = new Date().toISOString().split('T')[0];
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
        // Check for overdue fees
        const today = new Date().toISOString().split('T')[0];
        duesList.forEach(due => {
          if (due.status === 'pending' && due.dueDate && due.dueDate < today) {
            // Mark as overdue
            const dueRef = ref(database, `dues/${due.id}`);
            update(dueRef, { status: 'overdue' });
          }
        });
        setDues(duesList);
      } else {
        setDues([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addDue = async (due: Omit<FeeRecord, 'id'>) => {
    const duesRef = ref(database, 'dues');
    const newDueRef = push(duesRef);
    await set(newDueRef, due);
    return newDueRef.key;
  };

  // Create initial fee when member joins
  const createInitialFee = async (memberId: string, memberName: string, amount: number, joinDate: string) => {
    const periodStart = joinDate;
    const periodEnd = format(addDays(parseISO(joinDate), 30), 'yyyy-MM-dd');
    const dueDate = periodEnd;

    await addDue({
      memberId,
      memberName,
      periodStart,
      periodEnd,
      amount,
      dueDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  };

  // Create next 30-day fee after payment
  const createNextCycleFee = async (memberId: string, memberName: string, amount: number, previousPeriodEnd: string) => {
    const periodStart = previousPeriodEnd;
    const periodEnd = format(addDays(parseISO(previousPeriodEnd), 30), 'yyyy-MM-dd');
    const dueDate = periodEnd;

    // Check if this fee already exists
    const existingFee = dues.find(d => 
      d.memberId === memberId && 
      d.periodStart === periodStart
    );
    
    if (!existingFee) {
      await addDue({
        memberId,
        memberName,
        periodStart,
        periodEnd,
        amount,
        dueDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  };

  const markAsPaid = async (dueId: string, memberId: string, memberName: string, amount: number, periodEnd: string) => {
    const receiptNumber = `RCP-${Date.now()}`;
    const paidDate = new Date().toISOString();
    
    const dueRef = ref(database, `dues/${dueId}`);
    await update(dueRef, {
      status: 'paid',
      paidDate,
      receiptNumber,
    });
    
    await addActivity({
      type: 'payment',
      memberId,
      memberName,
      timestamp: paidDate,
      details: `Payment of ₹${amount} received from ${memberName}`,
    });

    // Create next cycle fee automatically
    await createNextCycleFee(memberId, memberName, amount, periodEnd);
    
    return receiptNumber;
  };

  const getMemberDues = (memberId: string) => {
    return dues.filter(due => due.memberId === memberId);
  };

  const getPendingDues = () => {
    return dues.filter(due => due.status === 'pending' || due.status === 'overdue');
  };

  return { dues, loading, addDue, markAsPaid, getMemberDues, getPendingDues, createInitialFee, createNextCycleFee };
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
