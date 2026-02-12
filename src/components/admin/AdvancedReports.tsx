import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, IndianRupee, Users, Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { 
  format, 
  parseISO, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  eachMonthOfInterval,
  subDays,
  isSameDay
} from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Member, AttendanceRecord, FeeRecord } from '@/types/library';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--accent))'];

const AdvancedReports = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dues, setDues] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [membersSnap, attendanceSnap, duesSnap] = await Promise.all([
          get(ref(database, 'members')),
          get(ref(database, 'attendance')),
          get(ref(database, 'dues')),
        ]);

        if (membersSnap.exists()) {
          const data = membersSnap.val();
          setMembers(Object.entries(data).map(([id, m]: [string, any]) => ({ id, ...m })));
        }

        if (attendanceSnap.exists()) {
          const data = attendanceSnap.val();
          setAttendance(Object.entries(data).map(([id, a]: [string, any]) => ({ id, ...a })));
        }

        if (duesSnap.exists()) {
          const data = duesSnap.val();
          setDues(Object.entries(data).map(([id, d]: [string, any]) => ({ id, ...d })));
        }
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Revenue data
  const revenueData = useMemo(() => {
    const paidDues = dues.filter((d) => d.status === 'paid' && d.paidDate);
    const monthlyRevenue: Record<string, number> = {};

    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    months.forEach((month) => {
      const key = format(month, 'MMM yyyy');
      monthlyRevenue[key] = 0;
    });

    paidDues.forEach((due) => {
      if (due.paidDate) {
        try {
          const month = format(parseISO(due.paidDate), 'MMM yyyy');
          if (monthlyRevenue[month] !== undefined) {
            monthlyRevenue[month] += due.amount;
          }
        } catch {}
      }
    });

    return Object.entries(monthlyRevenue).map(([month, amount]) => ({
      month,
      amount,
    }));
  }, [dues]);

  // Attendance trends
  const attendanceTrends = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let dateFormat: string;

    switch (timeRange) {
      case '7d':
        startDate = subDays(today, 7);
        dateFormat = 'EEE';
        break;
      case '30d':
        startDate = subDays(today, 30);
        dateFormat = 'dd MMM';
        break;
      case '90d':
        startDate = subDays(today, 90);
        dateFormat = 'dd MMM';
        break;
      case '12m':
        startDate = subMonths(today, 12);
        dateFormat = 'MMM';
        break;
    }

    const days = eachDayOfInterval({ start: startDate, end: today });
    const dailyCounts: Record<string, { present: number; totalHours: number }> = {};

    days.forEach((day) => {
      const key = format(day, dateFormat);
      if (!dailyCounts[key]) {
        dailyCounts[key] = { present: 0, totalHours: 0 };
      }
    });

    attendance.forEach((record) => {
      if (!record.date) return;
      try {
        const recordDate = parseISO(record.date);
        if (recordDate >= startDate && recordDate <= today) {
          const key = format(recordDate, dateFormat);
          if (dailyCounts[key]) {
            dailyCounts[key].present++;
            dailyCounts[key].totalHours += (record.duration || 0) / 60;
          }
        }
      } catch {}
    });

    // For 30d and 90d, sample every few days for cleaner chart
    const entries = Object.entries(dailyCounts);
    if (timeRange === '90d') {
      return entries.filter((_, i) => i % 7 === 0).map(([date, data]) => ({
        date,
        visitors: data.present,
        hours: Math.round(data.totalHours),
      }));
    }
    if (timeRange === '30d') {
      return entries.filter((_, i) => i % 3 === 0).map(([date, data]) => ({
        date,
        visitors: data.present,
        hours: Math.round(data.totalHours),
      }));
    }

    return entries.map(([date, data]) => ({
      date,
      visitors: data.present,
      hours: Math.round(data.totalHours),
    }));
  }, [attendance, timeRange]);

  // Member status distribution
  const memberDistribution = useMemo(() => {
    const active = members.filter((m) => m.status === 'active').length;
    const inactive = members.filter((m) => m.status === 'inactive').length;
    return [
      { name: 'Active', value: active },
      { name: 'Inactive', value: inactive },
    ];
  }, [members]);

  // Shift distribution
  const shiftDistribution = useMemo(() => {
    const shifts: Record<string, number> = {};
    members.forEach((m) => {
      const shift = m.shift || 'Full Day';
      shifts[shift] = (shifts[shift] || 0) + 1;
    });
    return Object.entries(shifts).map(([name, value]) => ({ name, value }));
  }, [members]);

  // Peak hours (based on entry times)
  const peakHours = useMemo(() => {
    const hourCounts: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[`${i}:00`] = 0;
    }

    attendance.forEach((record) => {
      if (record.entryTime) {
        try {
          const hour = parseInt(record.entryTime.split(':')[0]);
          if (!isNaN(hour)) {
            hourCounts[`${hour}:00`]++;
          }
        } catch {}
      }
    });

    return Object.entries(hourCounts)
      .filter(([hour]) => {
        const h = parseInt(hour);
        return h >= 6 && h <= 23;
      })
      .map(([hour, count]) => ({ hour, count }));
  }, [attendance]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalRevenue = dues.filter((d) => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0);
    const thisMonthStart = startOfMonth(new Date());
    const thisMonthRevenue = dues
      .filter((d) => d.status === 'paid' && d.paidDate && parseISO(d.paidDate) >= thisMonthStart)
      .reduce((sum, d) => sum + d.amount, 0);
    
    const totalHours = attendance.reduce((sum, a) => sum + (a.duration || 0), 0) / 60;
    const avgDailyVisitors = attendance.length > 0 
      ? Math.round(attendance.length / new Set(attendance.map(a => a.date)).size)
      : 0;

    return {
      totalRevenue,
      thisMonthRevenue,
      totalHours: Math.round(totalHours),
      avgDailyVisitors,
      totalMembers: members.length,
      activeMembers: members.filter(m => m.status === 'active').length,
    };
  }, [members, attendance, dues]);

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/3" />
          <div className="h-64 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">₹{summaryStats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold text-foreground">₹{summaryStats.thisMonthRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-accent-foreground" />
            <span className="text-sm text-muted-foreground">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summaryStats.totalHours.toLocaleString()}h</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Avg Daily</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summaryStats.avgDailyVisitors}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="card-elevated p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-display text-xl font-semibold text-foreground">Analytics</h3>
          </div>
          <Select value={timeRange} onValueChange={(val: any) => setTimeRange(val)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="peak">Peak Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">Status Distribution</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={memberDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {memberDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">Shift Distribution</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shiftDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {shiftDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="peak">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedReports;
