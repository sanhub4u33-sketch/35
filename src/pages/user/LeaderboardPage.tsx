import { useMemo } from 'react';
import { Trophy, Clock, Calendar, Medal, Crown } from 'lucide-react';
import { useAttendance, useMembers } from '@/hooks/useFirebaseData';

const LeaderboardPage = ({ currentMemberId }: { currentMemberId: string }) => {
  const { attendance } = useAttendance();
  const { members } = useMembers();

  const leaderboard = useMemo(() => {
    const memberStats = members
      .filter((m) => m.status === 'active')
      .map((member) => {
        const records = attendance.filter((a) => a.memberId === member.id);
        const uniqueDays = new Set(records.map((r) => r.date)).size;
        const totalMinutes = records.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

        // Current month stats
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthRecords = records.filter((r) => r.date.startsWith(monthStr));
        const monthDays = new Set(monthRecords.map((r) => r.date)).size;
        const monthMinutes = monthRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
        const monthHours = Math.round((monthMinutes / 60) * 10) / 10;

        return {
          id: member.id,
          name: member.name,
          profilePic: member.profilePic,
          totalDays: uniqueDays,
          totalHours,
          monthDays,
          monthHours,
        };
      });

    return memberStats.sort((a, b) => b.monthHours - a.monthHours || b.monthDays - a.monthDays);
  }, [members, attendance]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-warning" />;
    if (index === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (index === 2) return <Medal className="w-5 h-5 text-primary/70" />;
    return <span className="w-5 text-center text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const currentRank = leaderboard.findIndex((m) => m.id === currentMemberId);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">Leaderboard</h2>
      </div>

      {/* Your Rank */}
      {currentRank >= 0 && (
        <div className="card-elevated p-4 mb-6 border-primary/30">
          <p className="text-sm text-muted-foreground mb-1">Your Rank</p>
          <div className="flex items-center gap-3">
            {getRankIcon(currentRank)}
            <span className="text-2xl font-bold text-primary">#{currentRank + 1}</span>
            <span className="text-muted-foreground">of {leaderboard.length} members</span>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.map((member, index) => {
          const isMe = member.id === currentMemberId;
          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
                isMe
                  ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                  : 'bg-card border-border/50 hover:shadow-md'
              }`}
            >
              <div className="flex-shrink-0 w-8 flex justify-center">{getRankIcon(index)}</div>

              <div className="w-9 h-9 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden flex-shrink-0">
                {member.profilePic ? (
                  <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {member.name} {isMe && <span className="text-primary text-xs">(You)</span>}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {member.monthDays}d
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {member.monthHours}h
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-foreground">{member.monthHours}h</p>
                <p className="text-[10px] text-muted-foreground">this month</p>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No data yet</p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
