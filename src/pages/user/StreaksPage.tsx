import { useMemo } from 'react';
import { Flame, Calendar, Award, TrendingUp, Zap } from 'lucide-react';
import { useAttendance } from '@/hooks/useFirebaseData';
import { parseISO, differenceInCalendarDays, format, subDays, isSameDay } from 'date-fns';

const StreaksPage = ({ memberId }: { memberId: string }) => {
  const { attendance } = useAttendance();

  const streakData = useMemo(() => {
    const records = attendance.filter((a) => a.memberId === memberId);
    // Get unique attended dates sorted ascending
    const uniqueDates = [...new Set(records.map((r) => r.date))].sort();
    const parsedDates = uniqueDates.map((d) => parseISO(d));

    if (parsedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalDays: 0, last30: [], weeklyAvg: 0 };
    }

    // Current streak
    let currentStreak = 0;
    const today = new Date();
    let checkDate = today;

    // Check if attended today or yesterday (to allow streak to continue)
    const lastAttendedDate = parsedDates[parsedDates.length - 1];
    const daysSinceLast = differenceInCalendarDays(today, lastAttendedDate);

    if (daysSinceLast <= 1) {
      // Count backwards from last attended date
      for (let i = parsedDates.length - 1; i >= 0; i--) {
        const expected = subDays(lastAttendedDate, parsedDates.length - 1 - i >= 0 ? parsedDates.length - 1 - i : 0);
        // Simpler approach: count consecutive from end
        if (i === parsedDates.length - 1) {
          currentStreak = 1;
        } else {
          const diff = differenceInCalendarDays(parsedDates[i + 1], parsedDates[i]);
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < parsedDates.length; i++) {
      const diff = differenceInCalendarDays(parsedDates[i], parsedDates[i - 1]);
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Last 30 days attendance map
    const last30: { date: Date; attended: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const attended = parsedDates.some((pd) => isSameDay(pd, d));
      last30.push({ date: d, attended });
    }

    // Weekly average (last 4 weeks)
    const last28Days = last30.slice(2); // last 28
    const attendedLast28 = last28Days.filter((d) => d.attended).length;
    const weeklyAvg = Math.round((attendedLast28 / 4) * 10) / 10;

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalDays: uniqueDates.length,
      last30,
      weeklyAvg,
    };
  }, [attendance, memberId]);

  const getFlameColor = (streak: number) => {
    if (streak >= 30) return 'text-red-500';
    if (streak >= 14) return 'text-orange-500';
    if (streak >= 7) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-7 h-7 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">Streaks</h2>
      </div>

      {/* Current Streak Hero */}
      <div className="card-elevated p-6 sm:p-8 mb-6 text-center">
        <Flame className={`w-16 h-16 mx-auto mb-3 ${getFlameColor(streakData.currentStreak)}`} />
        <p className="text-5xl font-bold text-foreground mb-1">{streakData.currentStreak}</p>
        <p className="text-muted-foreground">day streak</p>
        {streakData.currentStreak >= 7 && (
          <p className="mt-3 text-sm text-primary font-medium">🔥 You're on fire! Keep going!</p>
        )}
        {streakData.currentStreak === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Visit the library today to start a streak!</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card text-center">
          <Award className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-xl font-bold text-foreground">{streakData.longestStreak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
        <div className="stat-card text-center">
          <Calendar className="w-5 h-5 mx-auto mb-2 text-success" />
          <p className="text-xl font-bold text-foreground">{streakData.totalDays}</p>
          <p className="text-xs text-muted-foreground">Total Days</p>
        </div>
        <div className="stat-card text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-accent-foreground" />
          <p className="text-xl font-bold text-foreground">{streakData.weeklyAvg}</p>
          <p className="text-xs text-muted-foreground">Weekly Avg</p>
        </div>
      </div>

      {/* Last 30 Days Grid */}
      <div className="card-elevated p-4 sm:p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Last 30 Days</h3>
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {streakData.last30.map((day, i) => (
            <div
              key={i}
              title={`${format(day.date, 'dd MMM')} - ${day.attended ? 'Present' : 'Absent'}`}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] sm:text-xs font-medium transition-all ${
                day.attended
                  ? 'bg-success/20 text-success'
                  : 'bg-secondary/50 text-muted-foreground/50'
              } ${isSameDay(day.date, new Date()) ? 'ring-2 ring-primary' : ''}`}
            >
              {format(day.date, 'd')}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/20" />
            <span className="text-xs text-muted-foreground">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-secondary/50" />
            <span className="text-xs text-muted-foreground">Absent</span>
          </div>
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="card-elevated p-4 sm:p-6 mt-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Milestones
        </h3>
        <div className="space-y-3">
          {[
            { days: 3, label: 'Getting Started', emoji: '🌱' },
            { days: 7, label: 'One Week Warrior', emoji: '⚡' },
            { days: 14, label: 'Two Week Champion', emoji: '🏆' },
            { days: 30, label: 'Monthly Master', emoji: '🔥' },
            { days: 60, label: 'Unstoppable', emoji: '💎' },
            { days: 100, label: 'Century Legend', emoji: '👑' },
          ].map((milestone) => {
            const achieved = streakData.longestStreak >= milestone.days;
            return (
              <div
                key={milestone.days}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  achieved ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/30 opacity-60'
                }`}
              >
                <span className="text-xl">{milestone.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {milestone.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{milestone.days} day streak</p>
                </div>
                {achieved && <span className="text-xs font-medium text-success">✓ Achieved</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StreaksPage;
