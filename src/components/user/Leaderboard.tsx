import { useState, useEffect, useMemo } from 'react';
import { Trophy, Flame, Medal, TrendingUp, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { format, parseISO, differenceInDays, isYesterday, isToday } from 'date-fns';
import { Member, AttendanceRecord, MemberStreak } from '@/types/library';

interface LeaderboardProps {
  currentMemberId: string;
}

interface LeaderboardEntry {
  memberId: string;
  memberName: string;
  profilePic?: string;
  value: number;
  rank: number;
  streak?: number;
}

const Leaderboard = ({ currentMemberId }: LeaderboardProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [streaks, setStreaks] = useState<Record<string, MemberStreak>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load members
        const membersRef = ref(database, 'members');
        const membersSnap = await get(membersRef);
        if (membersSnap.exists()) {
          const data = membersSnap.val();
          const memberList = Object.entries(data).map(([id, m]: [string, any]) => ({ id, ...m }));
          setMembers(memberList.filter((m) => m.status === 'active'));
        }

        // Load attendance
        const attendanceRef = ref(database, 'attendance');
        const attendanceSnap = await get(attendanceRef);
        if (attendanceSnap.exists()) {
          const data = attendanceSnap.val();
          const records = Object.entries(data).map(([id, a]: [string, any]) => ({ id, ...a }));
          setAttendance(records);
        }

        // Load or calculate streaks
        const streaksRef = ref(database, 'memberStreaks');
        const streaksSnap = await get(streaksRef);
        if (streaksSnap.exists()) {
          setStreaks(streaksSnap.val());
        }
      } catch (error) {
        console.error('Error loading leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate streaks from attendance data
  const calculatedStreaks = useMemo(() => {
    const memberStreakMap: Record<string, MemberStreak> = {};

    members.forEach((member) => {
      const memberAttendance = attendance
        .filter((a) => a.memberId === member.id)
        .map((a) => a.date)
        .filter((date, index, self) => self.indexOf(date) === index) // unique dates
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // newest first

      if (memberAttendance.length === 0) {
        memberStreakMap[member.id] = {
          memberId: member.id,
          currentStreak: 0,
          longestStreak: 0,
          lastAttendanceDate: '',
          totalDaysPresent: 0,
        };
        return;
      }

      const lastDate = memberAttendance[0];
      const lastDateObj = parseISO(lastDate);
      
      // Check if streak is still active (attended today or yesterday)
      const isStreakActive = isToday(lastDateObj) || isYesterday(lastDateObj);
      
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;

      if (isStreakActive) {
        currentStreak = 1;
        for (let i = 0; i < memberAttendance.length - 1; i++) {
          const current = parseISO(memberAttendance[i]);
          const next = parseISO(memberAttendance[i + 1]);
          const diff = differenceInDays(current, next);
          
          if (diff === 1) {
            tempStreak++;
            if (i < memberAttendance.length - 1) currentStreak = tempStreak;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        // Calculate longest streak from history
        for (let i = 0; i < memberAttendance.length - 1; i++) {
          const current = parseISO(memberAttendance[i]);
          const next = parseISO(memberAttendance[i + 1]);
          const diff = differenceInDays(current, next);
          
          if (diff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      memberStreakMap[member.id] = {
        memberId: member.id,
        currentStreak,
        longestStreak,
        lastAttendanceDate: lastDate,
        totalDaysPresent: memberAttendance.length,
      };
    });

    return memberStreakMap;
  }, [members, attendance]);

  // This month's attendance leaderboard
  const thisMonthLeaderboard = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthlyAttendance: Record<string, number> = {};

    attendance.forEach((record) => {
      if (record.date?.startsWith(currentMonth)) {
        if (!monthlyAttendance[record.memberId]) {
          monthlyAttendance[record.memberId] = 0;
        }
        // Count unique days
        monthlyAttendance[record.memberId]++;
      }
    });

    // Remove duplicates per day
    const uniqueDays: Record<string, Set<string>> = {};
    attendance.forEach((record) => {
      if (record.date?.startsWith(currentMonth)) {
        if (!uniqueDays[record.memberId]) {
          uniqueDays[record.memberId] = new Set();
        }
        uniqueDays[record.memberId].add(record.date);
      }
    });

    const leaderboard: LeaderboardEntry[] = members.map((member) => ({
      memberId: member.id,
      memberName: member.name,
      profilePic: member.profilePic,
      value: uniqueDays[member.id]?.size || 0,
      rank: 0,
      streak: calculatedStreaks[member.id]?.currentStreak || 0,
    }));

    return leaderboard
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .slice(0, 10);
  }, [members, attendance, calculatedStreaks]);

  // Streak leaderboard
  const streakLeaderboard = useMemo(() => {
    const leaderboard: LeaderboardEntry[] = members.map((member) => ({
      memberId: member.id,
      memberName: member.name,
      profilePic: member.profilePic,
      value: calculatedStreaks[member.id]?.currentStreak || 0,
      rank: 0,
    }));

    return leaderboard
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .slice(0, 10);
  }, [members, calculatedStreaks]);

  // Total hours leaderboard
  const hoursLeaderboard = useMemo(() => {
    const memberHours: Record<string, number> = {};

    attendance.forEach((record) => {
      if (!memberHours[record.memberId]) {
        memberHours[record.memberId] = 0;
      }
      memberHours[record.memberId] += record.duration || 0;
    });

    const leaderboard: LeaderboardEntry[] = members.map((member) => ({
      memberId: member.id,
      memberName: member.name,
      profilePic: member.profilePic,
      value: Math.round((memberHours[member.id] || 0) / 60), // Convert to hours
      rank: 0,
    }));

    return leaderboard
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .slice(0, 10);
  }, [members, attendance]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-muted-foreground font-medium">{rank}</span>;
    }
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], valueLabel: string, valueIcon?: React.ReactNode) => (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.memberId}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            entry.memberId === currentMemberId
              ? 'bg-primary/10 border border-primary/20'
              : 'bg-secondary/50 hover:bg-secondary/70'
          }`}
        >
          <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
          <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
            {entry.profilePic ? (
              <img src={entry.profilePic} alt={entry.memberName} className="w-full h-full object-cover" />
            ) : (
              entry.memberName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {entry.memberName}
              {entry.memberId === currentMemberId && (
                <span className="text-xs text-primary ml-2">(You)</span>
              )}
            </p>
            {entry.streak !== undefined && entry.streak > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                {entry.streak} day streak
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-foreground flex items-center gap-1">
              {valueIcon}
              {entry.value}
            </p>
            <p className="text-xs text-muted-foreground">{valueLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-secondary rounded w-1/3" />
          <div className="h-12 bg-secondary rounded" />
          <div className="h-12 bg-secondary rounded" />
          <div className="h-12 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-display text-lg font-semibold text-foreground">Leaderboard</h3>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="monthly" className="text-xs sm:text-sm">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="streaks" className="text-xs sm:text-sm">
            <Flame className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Streaks
          </TabsTrigger>
          <TabsTrigger value="hours" className="text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Hours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-0">
          {thisMonthLeaderboard.length > 0 ? (
            renderLeaderboard(thisMonthLeaderboard, 'days')
          ) : (
            <p className="text-center text-muted-foreground py-8">No attendance data this month</p>
          )}
        </TabsContent>

        <TabsContent value="streaks" className="mt-0">
          {streakLeaderboard.length > 0 ? (
            renderLeaderboard(streakLeaderboard, 'days', <Flame className="w-4 h-4 text-orange-500" />)
          ) : (
            <p className="text-center text-muted-foreground py-8">No streak data available</p>
          )}
        </TabsContent>

        <TabsContent value="hours" className="mt-0">
          {hoursLeaderboard.length > 0 ? (
            renderLeaderboard(hoursLeaderboard, 'hours')
          ) : (
            <p className="text-center text-muted-foreground py-8">No hours data available</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Current user's streak */}
      {calculatedStreaks[currentMemberId] && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Your Streak</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">
                {calculatedStreaks[currentMemberId].currentStreak} days
              </p>
              <p className="text-xs text-muted-foreground">
                Best: {calculatedStreaks[currentMemberId].longestStreak} days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
