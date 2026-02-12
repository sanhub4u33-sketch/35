import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  LogOut, 
  Clock, 
  IndianRupee, 
  Calendar,
  CheckCircle,
  AlertCircle,
  LogIn,
  LogOut as LogOutIcon,
  Camera,
  TrendingUp,
  BarChart3,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance, useDues, useCurrentMemberAttendance } from '@/hooks/useFirebaseData';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Member } from '@/types/library';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, differenceInDays } from 'date-fns';
import NotificationBell from '@/components/notifications/NotificationBell';
import ChatModule from '@/components/chat/ChatModule';
import { useChat } from '@/hooks/useChatAndNotifications';
import StudyTimer from '@/components/user/StudyTimer';
import Leaderboard from '@/components/user/Leaderboard';
import FeedbackForm from '@/components/user/FeedbackForm';

// Image compression utility
const compressImage = (file: File, maxSizeKB: number = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down if too large
        const maxDimension = 300;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Start with high quality and reduce until under maxSizeKB
        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const { attendance, markEntry, markExit, getMemberAttendance } = useAttendance();
  const { dues, getMemberDues } = useDues();
  const currentSession = useCurrentMemberAttendance(memberData?.id || '');
  const [currentMonth] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChat, setShowChat] = useState(false);
  // Check if chat is enabled
  const { chatEnabled } = useChat(memberData?.id || '', memberData?.name || '');

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!user) return;
      
      try {
        // Find member by email in the members collection
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        
        if (snapshot.exists()) {
          const members = snapshot.val();
          const memberEntry = Object.entries(members).find(
            ([_, member]: [string, any]) => member.email === user.email
          );
          
          if (memberEntry) {
            setMemberData({ id: memberEntry[0], ...memberEntry[1] as Omit<Member, 'id'> });
          }
        }
      } catch (error) {
        console.error('Error fetching member data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [user]);

  const memberAttendance = memberData ? getMemberAttendance(memberData.id) : [];
  const memberDues = memberData ? getMemberDues(memberData.id) : [];
  const paidDues = memberDues.filter(d => d.status === 'paid');
  const totalPaid = paidDues.reduce((sum, d) => sum + d.amount, 0);

  // Calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAttendanceForDay = (date: Date) => {
    return memberAttendance.find(record => 
      isSameDay(parseISO(record.date), date)
    );
  };

  const thisMonthAttendance = memberAttendance.filter(
    a => a.date.startsWith(format(currentMonth, 'yyyy-MM'))
  );

  // Analytics calculations
  const analytics = useMemo(() => {
    const today = new Date();
    const lastMonth = subMonths(today, 1);
    
    // Total days present (all time)
    const totalDaysPresent = new Set(memberAttendance.map(a => a.date)).size;
    
    // Days present this month
    const thisMonthDays = new Set(thisMonthAttendance.map(a => a.date)).size;
    
    // Days in current month so far
    const daysInCurrentMonth = today.getDate();
    
    // Attendance rate this month
    const attendanceRate = daysInCurrentMonth > 0 
      ? Math.round((thisMonthDays / daysInCurrentMonth) * 100) 
      : 0;
    
    // Average time spent
    const sessionsWithDuration = memberAttendance.filter(a => a.duration);
    const avgDuration = sessionsWithDuration.length > 0 
      ? Math.round(sessionsWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / sessionsWithDuration.length)
      : 0;
    
    // Total hours studied
    const totalMinutes = memberAttendance.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    
    // Absent days this month
    const absentDays = daysInCurrentMonth - thisMonthDays;
    
    // Days since joining
    const joinDate = memberData?.joinDate ? parseISO(memberData.joinDate) : today;
    const daysSinceJoining = differenceInDays(today, joinDate);

    return {
      totalDaysPresent,
      thisMonthDays,
      attendanceRate,
      avgDuration,
      totalHours,
      absentDays,
      daysSinceJoining,
    };
  }, [memberAttendance, thisMonthAttendance, memberData]);

  const handleMarkEntry = async () => {
    if (!memberData) return;
    try {
      await markEntry(memberData.id, memberData.name);
      toast.success('Entry marked successfully!');
    } catch (error) {
      toast.error('Failed to mark entry');
    }
  };

  const handleMarkExit = async () => {
    if (!memberData || !currentSession) return;
    try {
      await markExit(currentSession.id, memberData.id, memberData.name, currentSession.entryTime);
      toast.success('Exit marked successfully!');
    } catch (error) {
      toast.error('Failed to mark exit');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !memberData) return;

    try {
      toast.loading('Uploading profile picture...');
      const compressedImage = await compressImage(file, 100);
      
      // Update member profile in Firebase
      const memberRef = ref(database, `members/${memberData.id}`);
      await update(memberRef, { profilePic: compressedImage });
      
      setMemberData({ ...memberData, profilePic: compressedImage });
      toast.dismiss();
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload profile picture');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-elevated p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Account Not Found</h1>
          <p className="text-muted-foreground mb-6">
            Your member account could not be found. Please contact the library admin.
          </p>
          <Button onClick={handleLogout} variant="outline">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hero-gradient flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-lg font-bold text-foreground truncate">Shri Hanumant Library</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Member Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Chat Icon */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => chatEnabled && setShowChat(true)}
              disabled={!chatEnabled}
              className={!chatEnabled ? 'opacity-50 cursor-not-allowed' : ''}
              title={chatEnabled ? 'Open Chat' : 'Chat is disabled by admin'}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>

            {/* Notification Bell */}
            {memberData && <NotificationBell memberId={memberData.id} />}

            <div className="text-right hidden sm:block">
              <p className="font-medium text-foreground text-sm">{memberData.name}</p>
              <p className="text-xs text-muted-foreground">{memberData.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Module */}
      {showChat && memberData && (
        <ChatModule 
          memberId={memberData.id}
          memberName={memberData.name}
          onClose={() => setShowChat(false)}
        />
      )}

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Welcome Section with Profile Picture */}
        <div className="card-elevated p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-xl sm:text-2xl font-bold overflow-hidden">
                  {memberData.profilePic ? (
                    <img src={memberData.profilePic} alt={memberData.name} className="w-full h-full object-cover" />
                  ) : (
                    memberData.name.charAt(0).toUpperCase()
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleProfilePicChange}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  Welcome, {memberData.name.split(' ')[0]}!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Seat: {memberData.seatNumber || 'N/A'} • Shift: {memberData.shift || 'Full Day'}
                </p>
              </div>
            </div>

            {/* Attendance Button */}
            <div className="w-full sm:w-auto">
              {currentSession ? (
                <div className="text-center sm:text-right">
                  <p className="text-sm text-success mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                    In Library since {currentSession.entryTime}
                  </p>
                  <Button 
                    onClick={handleMarkExit}
                    variant="outline"
                    className="w-full sm:w-auto gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    Mark Exit
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleMarkEntry}
                  className="w-full sm:w-auto btn-primary gap-2"
                  size="lg"
                >
                  <LogIn className="w-5 h-5" />
                  Mark Entry
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">This Month</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {analytics.thisMonthDays} <span className="text-sm font-normal text-muted-foreground">days</span>
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              <span className="text-xs sm:text-sm text-muted-foreground">Attendance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-success">
              {analytics.attendanceRate}%
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">Avg. Time</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {Math.floor(analytics.avgDuration / 60)}h {analytics.avgDuration % 60}m
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Hours</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {analytics.totalHours}h
            </p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-muted-foreground">Total Fee Paid</span>
            </div>
            <p className="text-2xl font-bold text-success">
              ₹{totalPaid}
            </p>
            <p className="text-sm text-muted-foreground">
              {paidDues.length} payment{paidDues.length !== 1 ? 's' : ''} made
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <IndianRupee className="w-5 h-5 text-success" />
              <span className="text-muted-foreground">Monthly Fee</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₹{memberData.monthlyFee}</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Absent Days</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{analytics.absentDays}</p>
            <p className="text-sm text-muted-foreground">this month</p>
          </div>
        </div>

        {/* Study Timer & Leaderboard Row */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <StudyTimer memberId={memberData.id} memberName={memberData.name} />
          <Leaderboard currentMemberId={memberData.id} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Attendance Calendar */}
          <div className="card-elevated p-4 sm:p-6">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
              {format(currentMonth, 'MMMM yyyy')} Attendance
            </h3>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                  {day}
                </div>
              ))}
              
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1 sm:p-2" />
              ))}

              {daysInMonth.map((day) => {
                const record = getAttendanceForDay(day);
                const isPresent = !!record;
                const isToday = isSameDay(day, new Date());
                const isFuture = day > new Date();

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-1.5 sm:p-2 rounded-lg text-center text-xs sm:text-sm ${
                      isFuture 
                        ? 'bg-secondary/30 text-muted-foreground/50'
                        : isPresent 
                          ? 'bg-success/20 text-success' 
                          : 'bg-secondary/50 text-muted-foreground'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <span className="font-medium">{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-success/20" />
                <span className="text-xs sm:text-sm text-muted-foreground">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-secondary/50" />
                <span className="text-xs sm:text-sm text-muted-foreground">Absent</span>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="card-elevated p-4 sm:p-6">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
              Recent Activity
            </h3>

            {memberAttendance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No attendance records yet
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {memberAttendance.slice(0, 10).map((record) => (
                  <div 
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${record.exitTime ? 'bg-muted-foreground' : 'bg-success'}`} />
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {format(parseISO(record.date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {record.entryTime} - {record.exitTime || 'In Progress'}
                        </p>
                      </div>
                    </div>
                    {record.duration && (
                      <span className="text-xs sm:text-sm font-medium text-primary">
                        {Math.floor(record.duration / 60)}h {record.duration % 60}m
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fees Section */}
          <div className="card-elevated p-4 sm:p-6 lg:col-span-2">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
              Fee History
            </h3>

            {memberDues.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No fee records yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm">Period</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm">Amount</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm hidden sm:table-cell">Due Date</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm">Status</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm hidden sm:table-cell">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberDues.map((due) => (
                      <tr key={due.id} className="border-b border-border">
                        <td className="p-2 sm:p-3 text-xs sm:text-sm">
                          {format(parseISO(due.periodStart), 'dd MMM')} - {format(parseISO(due.periodEnd), 'dd MMM')}
                        </td>
                        <td className="p-2 sm:p-3 font-semibold text-sm">₹{due.amount}</td>
                        <td className="p-2 sm:p-3 text-sm hidden sm:table-cell">{format(parseISO(due.dueDate), 'dd MMM yyyy')}</td>
                        <td className="p-2 sm:p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            due.status === 'paid' 
                              ? 'bg-success/10 text-success'
                              : due.status === 'overdue'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-warning/10 text-warning'
                          }`}>
                            {due.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                            {due.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                            {due.status === 'pending' && <Clock className="w-3 h-3" />}
                            {due.status}
                          </span>
                        </td>
                        <td className="p-2 sm:p-3 text-sm hidden sm:table-cell">
                          {due.receiptNumber || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feedback Form */}
          <FeedbackForm memberId={memberData.id} memberName={memberData.name} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 sm:py-6 mt-8 sm:mt-12">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Shri Hanumant Library. All rights reserved.</p>
          <p className="mt-1">Need help? Contact: +91 79913 04874</p>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;