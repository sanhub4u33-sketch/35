import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Target, Coffee, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ref, push, get, set, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { format } from 'date-fns';

interface StudyTimerProps {
  memberId: string;
  memberName: string;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_CONFIGS: Record<TimerMode, { duration: number; label: string; color: string }> = {
  focus: { duration: 25 * 60, label: 'Focus Time', color: 'text-primary' },
  shortBreak: { duration: 5 * 60, label: 'Short Break', color: 'text-success' },
  longBreak: { duration: 15 * 60, label: 'Long Break', color: 'text-accent-foreground' },
};

const StudyTimer = ({ memberId, memberName }: StudyTimerProps) => {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIGS.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(120); // 2 hours default
  const [todayMinutes, setTodayMinutes] = useState(0);

  // Load today's study data
  useEffect(() => {
    const loadTodayData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      try {
        // Load study sessions
        const sessionsRef = ref(database, 'studySessions');
        const snapshot = await get(sessionsRef);
        if (snapshot.exists()) {
          const sessions = snapshot.val();
          let totalMinutes = 0;
          let pomodoros = 0;
          Object.values(sessions).forEach((session: any) => {
            if (session.memberId === memberId && session.date === today) {
              totalMinutes += session.duration || 0;
              if (session.type === 'pomodoro') pomodoros++;
            }
          });
          setTodayMinutes(totalMinutes);
          setPomodorosCompleted(pomodoros);
        }

        // Load goals
        const goalRef = ref(database, `studyGoals/${memberId}`);
        const goalSnap = await get(goalRef);
        if (goalSnap.exists()) {
          setDailyGoal(goalSnap.val().dailyGoalMinutes || 120);
        }
      } catch (error) {
        console.error('Error loading study data:', error);
      }
    };
    loadTodayData();
  }, [memberId]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    const config = TIMER_CONFIGS[mode];
    
    if (mode === 'focus') {
      // Save completed pomodoro
      const today = format(new Date(), 'yyyy-MM-dd');
      const sessionData = {
        memberId,
        date: today,
        duration: 25, // 25 minutes
        type: 'pomodoro',
        completedAt: new Date().toISOString(),
      };
      
      try {
        await push(ref(database, 'studySessions'), sessionData);
        setTodayMinutes((prev) => prev + 25);
        setPomodorosCompleted((prev) => prev + 1);
        
        // Play notification sound (browser API)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🎉 Pomodoro Complete!', {
            body: 'Great work! Take a break.',
            icon: '/icons/library-logo.png',
          });
        }
        
        toast.success('🎉 Pomodoro completed! Take a break.');
        
        // Auto-switch to break
        const newPomodoros = pomodorosCompleted + 1;
        if (newPomodoros % 4 === 0) {
          setMode('longBreak');
          setTimeLeft(TIMER_CONFIGS.longBreak.duration);
        } else {
          setMode('shortBreak');
          setTimeLeft(TIMER_CONFIGS.shortBreak.duration);
        }
      } catch (error) {
        console.error('Error saving session:', error);
      }
    } else {
      toast.success('Break over! Ready for another focus session?');
      setMode('focus');
      setTimeLeft(TIMER_CONFIGS.focus.duration);
    }
  }, [mode, memberId, pomodorosCompleted]);

  const toggleTimer = () => {
    if (!isRunning && mode === 'focus') {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_CONFIGS[mode].duration);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(TIMER_CONFIGS[newMode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((TIMER_CONFIGS[mode].duration - timeLeft) / TIMER_CONFIGS[mode].duration) * 100;
  const goalProgress = Math.min((todayMinutes / dailyGoal) * 100, 100);

  return (
    <div className="card-elevated p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Study Timer
        </h3>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Today:</span>
          <span className="font-semibold text-primary">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === 'focus' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchMode('focus')}
          className="flex-1 gap-1"
        >
          <Target className="w-4 h-4" />
          Focus
        </Button>
        <Button
          variant={mode === 'shortBreak' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchMode('shortBreak')}
          className="flex-1 gap-1"
        >
          <Coffee className="w-4 h-4" />
          Short
        </Button>
        <Button
          variant={mode === 'longBreak' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchMode('longBreak')}
          className="flex-1 gap-1"
        >
          <Coffee className="w-4 h-4" />
          Long
        </Button>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <p className={`text-sm font-medium mb-2 ${TIMER_CONFIGS[mode].color}`}>
          {TIMER_CONFIGS[mode].label}
        </p>
        <div className={`text-5xl sm:text-6xl font-mono font-bold ${TIMER_CONFIGS[mode].color} mb-4`}>
          {formatTime(timeLeft)}
        </div>
        <Progress value={progressPercent} className="h-2 mb-4" />
        
        <div className="flex justify-center gap-3">
          <Button
            onClick={toggleTimer}
            size="lg"
            className={isRunning ? 'bg-destructive hover:bg-destructive/90' : 'btn-primary'}
          >
            {isRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button onClick={resetTimer} variant="outline" size="lg">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{pomodorosCompleted}</p>
          <p className="text-xs text-muted-foreground">Pomodoros Today</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{Math.round(goalProgress)}%</p>
          <p className="text-xs text-muted-foreground">Daily Goal</p>
        </div>
      </div>

      {/* Goal Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Daily Goal Progress</span>
          <span>{todayMinutes}/{dailyGoal} min</span>
        </div>
        <Progress value={goalProgress} className="h-2" />
      </div>
    </div>
  );
};

export default StudyTimer;
