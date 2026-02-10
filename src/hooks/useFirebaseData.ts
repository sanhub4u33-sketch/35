import { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Member, AttendanceRecord, FeeRecord, Activity } from '@/types/library';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';

// ─── Members ───────────────────────────────────────────────────────────
export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'members'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
      setMembers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addMember = async (member: Omit<Member, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(firestore, 'members'), {
      ...member,
      createdAt: new Date().toISOString(),
    });

    await addActivity({
      type: 'member_added',
      memberId: docRef.id,
      memberName: member.name,
      timestamp: new Date().toISOString(),
      details: `New member ${member.name} added`,
    });

    return docRef.id;
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    await updateDoc(doc(firestore, 'members', id), updates as any);
  };

  const deleteMember = async (id: string, memberName: string) => {
    await deleteDoc(doc(firestore, 'members', id));

    await addActivity({
      type: 'member_removed',
      memberId: id,
      memberName,
      timestamp: new Date().toISOString(),
      details: `Member ${memberName} removed`,
    });
  };

  return { members, loading, addMember, updateMember, deleteMember };
};

// ─── Attendance ────────────────────────────────────────────────────────
export const useAttendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'attendance'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
        .sort(
          (a, b) =>
            new Date(b.date + ' ' + b.entryTime).getTime() -
            new Date(a.date + ' ' + a.entryTime).getTime()
        );
      setAttendance(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const markEntry = async (memberId: string, memberName: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-IN', { hour12: false });

    const docRef = await addDoc(collection(firestore, 'attendance'), {
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

    return docRef.id;
  };

  const markExit = async (
    attendanceId: string,
    memberId: string,
    memberName: string,
    entryTime: string
  ) => {
    const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const entryDate = new Date();
    const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
    entryDate.setHours(entryHours, entryMinutes, 0);

    const exitDate = new Date();
    const [exitHours, exitMinutes] = now.split(':').map(Number);
    exitDate.setHours(exitHours, exitMinutes, 0);

    const duration = Math.round(
      (exitDate.getTime() - entryDate.getTime()) / (1000 * 60)
    );

    await updateDoc(doc(firestore, 'attendance', attendanceId), {
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return attendance.filter((record) => record.date === today);
  };

  const getMemberAttendance = (memberId: string) => {
    return attendance.filter((record) => record.memberId === memberId);
  };

  const getMonthlyAttendance = (year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return attendance.filter((record) => record.date.startsWith(monthStr));
  };

  return {
    attendance,
    loading,
    markEntry,
    markExit,
    getTodayAttendance,
    getMemberAttendance,
    getMonthlyAttendance,
  };
};

// ─── Dues / Fees ───────────────────────────────────────────────────────
export const useDues = () => {
  const [dues, setDues] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'dues'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as FeeRecord))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      setDues(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const recordPayment = async (payment: {
    memberId: string;
    memberName: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    paymentDate?: string;
    feeName?: string;
  }) => {
    const receiptNumber = `RCP-${Date.now()}`;
    const now = new Date().toISOString();
    const paidDate = payment.paymentDate
      ? new Date(payment.paymentDate + 'T12:00:00').toISOString()
      : now;

    await addDoc(collection(firestore, 'dues'), {
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
      ...(payment.feeName ? { feeName: payment.feeName } : {}),
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
    return dues
      .filter((d) => d.memberId === memberId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  };

  const getPendingDues = () => {
    return dues.filter((d) => d.status === 'pending');
  };

  const deletePayment = async (dueId: string) => {
    await deleteDoc(doc(firestore, 'dues', dueId));
  };

  const markDuePaid = async (
    dueId: string,
    memberName: string,
    amount: number
  ) => {
    const receiptNumber = `RCP-${Date.now()}`;
    const now = new Date().toISOString();
    await updateDoc(doc(firestore, 'dues', dueId), {
      status: 'paid',
      paidDate: now,
      receiptNumber,
    });

    await addActivity({
      type: 'payment',
      memberId: '',
      memberName,
      timestamp: now,
      details: `Payment of ₹${amount} received from ${memberName} (marked as paid)`,
    });

    return receiptNumber;
  };

  return {
    dues,
    loading,
    recordPayment,
    getMemberDues,
    getPendingDues,
    deletePayment,
    markDuePaid,
  };
};

// ─── Auto-due generation ───────────────────────────────────────────────
export const useAutoDueGeneration = (members: Member[], dues: FeeRecord[]) => {
  const processingRef = useRef(false);

  useEffect(() => {
    if (members.length === 0) return;
    if (processingRef.current) return;

    const checkAndCreateDues = async () => {
      processingRef.current = true;
      try {
        const today = new Date();

        for (const member of members) {
          if (member.status !== 'active') continue;

          // Fetch fresh dues from Firestore
          const duesSnap = await getDocs(collection(firestore, 'dues'));
          let freshMemberDues: FeeRecord[] = duesSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FeeRecord))
            .filter((d) => d.memberId === member.id);

          const joinDate = member.joinDate
            ? parseISO(member.joinDate)
            : parseISO(member.createdAt.split('T')[0]);

          const daysSinceJoin = differenceInDays(today, joinDate);
          if (daysSinceJoin < 30) continue;

          let latestPeriodEnd: Date = joinDate;
          if (freshMemberDues.length > 0) {
            const sorted = [...freshMemberDues].sort(
              (a, b) =>
                parseISO(b.periodEnd).getTime() -
                parseISO(a.periodEnd).getTime()
            );
            latestPeriodEnd = parseISO(sorted[0].periodEnd);
          }

          while (differenceInDays(today, latestPeriodEnd) >= 30) {
            const newPeriodStart = format(
              addDays(latestPeriodEnd, 1),
              'yyyy-MM-dd'
            );
            const newPeriodEnd = format(
              addDays(latestPeriodEnd, 30),
              'yyyy-MM-dd'
            );

            const overlapping = freshMemberDues.some(
              (d) =>
                d.periodStart === newPeriodStart ||
                d.periodEnd === newPeriodEnd
            );
            if (overlapping) break;

            const newDue: Omit<FeeRecord, 'id'> = {
              memberId: member.id,
              memberName: member.name,
              periodStart: newPeriodStart,
              periodEnd: newPeriodEnd,
              amount: member.monthlyFee,
              dueDate: newPeriodEnd,
              status: 'pending',
              createdAt: new Date().toISOString(),
            };
            const newDocRef = await addDoc(
              collection(firestore, 'dues'),
              newDue
            );

            freshMemberDues.push({ id: newDocRef.id, ...newDue });
            latestPeriodEnd = parseISO(newPeriodEnd);
          }
        }
      } finally {
        processingRef.current = false;
      }
    };

    checkAndCreateDues();
  }, [members, dues]);
};

// ─── Activities ────────────────────────────────────────────────────────
export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, 'activities'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Activity))
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      setActivities(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { activities, loading };
};

const addActivity = async (activity: Omit<Activity, 'id'>) => {
  await addDoc(collection(firestore, 'activities'), activity);
};

// ─── Current Member Attendance ─────────────────────────────────────────
export const useCurrentMemberAttendance = (memberId: string) => {
  const [currentSession, setCurrentSession] = useState<AttendanceRecord | null>(
    null
  );

  useEffect(() => {
    if (!memberId) return;

    const today = new Date().toISOString().split('T')[0];

    const unsub = onSnapshot(collection(firestore, 'attendance'), (snap) => {
      const todayRecords = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
        .filter(
          (record) =>
            record.memberId === memberId &&
            record.date === today &&
            !record.exitTime
        );

      if (todayRecords.length > 0) {
        setCurrentSession(todayRecords[todayRecords.length - 1]);
      } else {
        setCurrentSession(null);
      }
    });

    return () => unsub();
  }, [memberId]);

  return currentSession;
};
