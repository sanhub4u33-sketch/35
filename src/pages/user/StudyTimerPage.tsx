import { useState, useEffect, useMemo } from 'react';
import { Timer, Play, Pause, RotateCcw, Clock, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/hooks/useFirebaseData';
import { AttendanceRecord } from '@/types/library';

const StudyTimerPage = ({
  memberId,
  currentSession,
}: {
  memberId: string;
  currentSession: AttendanceRecord | null;
}) => {
  const { attendance } = useAttendance();

  // Live session timer
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!currentSession) {
      setElapsed(0);
      return;
    }
    const calcElapsed = () => {
      const [h, m, s] = currentSession.entryTime.split(':').map(Number);
      const entry = new Date();
      entry.setHours(h, m, s || 0, 0);
      return Math.max(0, Math.floor((Date.now() - entry.getTime()) / 1000));
    };
    setElapsed(calcElapsed());
    const interval = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  // Personal study timer (pomodoro-style)
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 min default
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroRemaining, setPomodoroRemaining] = useState(25 * 60);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  useEffect(() => {
    if (!pomodoroRunning || pomodoroRemaining <= 0) {
      if (pomodoroRemaining <= 0 && pomodoroRunning) {
        setPomodoroRunning(false);
        setCompletedPomodoros((c) => c + 1);
        // Play a notification sound or toast
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Study Timer', { body: 'Time is up! Take a break.' });
        }
      }
      return;
    }
    const interval = setInterval(() => setPomodoroRemaining((r) => r - 1), 1000);
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroRemaining]);

  const resetPomodoro = () => {
    setPomodoroRunning(false);
    setPomodoroRemaining(pomodoroTime);
  };

  const setPreset = (minutes: number) => {
    setPomodoroTime(minutes * 60);
    setPomodoroRemaining(minutes * 60);
    setPomodoroRunning(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Stats
  const stats = useMemo(() => {
    const records = attendance.filter((a) => a.memberId === memberId);
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter((r) => r.date === today);
    const todayMinutes = todayRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

    // This week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStr = weekStart.toISOString().split('T')[0];
    const weekRecords = records.filter((r) => r.date >= weekStr);
    const weekMinutes = weekRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

    return { todayMinutes, weekMinutes, todayRecords: todayRecords.length, weekDays: new Set(weekRecords.map(r => r.date)).size };
  }, [attendance, memberId]);

  const pomodoroProgress = pomodoroTime > 0 ? ((pomodoroTime - pomodoroRemaining) / pomodoroTime) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Timer className="w-7 h-7 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">Study Timer</h2>
      </div>

      {/* Live Session Timer */}
      <div className="card-elevated p-6 sm:p-8 mb-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {currentSession ? 'Current Session' : 'No Active Session'}
        </p>
        <div className={`text-5xl sm:text-6xl font-mono font-bold mb-3 ${currentSession ? 'text-success' : 'text-muted-foreground/30'}`}>
          {formatTime(elapsed)}
        </div>
        {currentSession && (
          <p className="text-sm text-muted-foreground">
            Started at {currentSession.entryTime}
          </p>
        )}
        {!currentSession && (
          <p className="text-sm text-muted-foreground">
            Mark entry from the dashboard to start tracking
          </p>
        )}
      </div>

      {/* Pomodoro Timer */}
      <div className="card-elevated p-6 sm:p-8 mb-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 text-center">Focus Timer</h3>

        {/* Timer Circle */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pomodoroProgress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold text-foreground">{formatTime(pomodoroRemaining)}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {completedPomodoros > 0 && `${completedPomodoros} completed`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button
            onClick={() => setPomodoroRunning(!pomodoroRunning)}
            className={pomodoroRunning ? 'bg-destructive hover:bg-destructive/90' : 'btn-primary'}
            size="lg"
          >
            {pomodoroRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
            {pomodoroRunning ? 'Pause' : 'Start'}
          </Button>
          <Button onClick={resetPomodoro} variant="outline" size="lg">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        {/* Presets */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[15, 25, 45, 60, 90].map((min) => (
            <Button
              key={min}
              variant={pomodoroTime === min * 60 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset(min)}
              className="text-xs"
            >
              {min}m
            </Button>
          ))}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-xl font-bold text-foreground">
            {Math.floor(stats.todayMinutes / 60)}h {stats.todayMinutes % 60}m
          </p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
        <div className="stat-card text-center">
          <Target className="w-5 h-5 mx-auto mb-2 text-success" />
          <p className="text-xl font-bold text-foreground">{stats.todayRecords}</p>
          <p className="text-xs text-muted-foreground">Sessions Today</p>
        </div>
        <div className="stat-card text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-accent-foreground" />
          <p className="text-xl font-bold text-foreground">
            {Math.floor(stats.weekMinutes / 60)}h
          </p>
          <p className="text-xs text-muted-foreground">This Week</p>
        </div>
        <div className="stat-card text-center">
          <Timer className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-xl font-bold text-foreground">{completedPomodoros}</p>
          <p className="text-xs text-muted-foreground">Pomodoros</p>
        </div>
      </div>
    </div>
  );
};

export default StudyTimerPage;
