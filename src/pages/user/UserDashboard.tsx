import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, Routes, Route } from 'react-router-dom';
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
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance, useDues, useCurrentMemberAttendance } from '@/hooks/useFirebaseData';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Member } from '@/types/library';
import { toast } from 'sonner';
import { verifyLibraryLocation } from '@/lib/geolocation';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import ChatModule from '@/components/chat/ChatModule';
import { useChat } from '@/hooks/useChatAndNotifications';
import UserLayout from '@/components/UserLayout';
import LeaderboardPage from './LeaderboardPage';
import StreaksPage from './StreaksPage';
import StudyTimerPage from './StudyTimerPage';

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
  const [locationChecking, setLocationChecking] = useState(false);
  const { attendance, markEntry, markExit, getMemberAttendance } = useAttendance();
  const { dues, getMemberDues } = useDues();
  const currentSession = useCurrentMemberAttendance(memberData?.id || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChat, setShowChat] = useState(false);
  const { chatEnabled } = useChat(memberData?.id || '', memberData?.name || '');

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!user) return;
      try {
        const membersSnap = await getDocs(
          query(collection(firestore, 'members'), where('email', '==', user.email))
        );
        if (!membersSnap.empty) {
          const d = membersSnap.docs[0];
          setMemberData({ id: d.id, ...d.data() } as Member);
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
  const pendingMemberDues = memberDues.filter(d => d.status === 'pending');
  const totalPaid = paidDues.reduce((sum, d) => sum + d.amount, 0);
  const totalPending = pendingMemberDues.reduce((sum, d) => sum + d.amount, 0);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAttendanceForDay = (date: Date) => {
    return memberAttendance.find(record => isSameDay(parseISO(record.date), date));
  };

  const thisMonthAttendance = memberAttendance.filter(
    a => a.date.startsWith(format(currentMonth, 'yyyy-MM'))
  );

  const analytics = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(today, 'yyyy-MM');
    const totalDaysPresent = new Set(memberAttendance.map(a => a.date)).size;
    const thisMonthDays = new Set(thisMonthAttendance.map(a => a.date)).size;
    const totalDaysInMonth = endOfMonth(currentMonth).getDate();
    const relevantDays = isCurrentMonth ? today.getDate() : totalDaysInMonth;
    const attendanceRate = relevantDays > 0 ? Math.round((thisMonthDays / relevantDays) * 100) : 0;
    const sessionsWithDuration = memberAttendance.filter(a => a.duration);
    const avgDuration = sessionsWithDuration.length > 0
      ? Math.round(sessionsWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / sessionsWithDuration.length)
      : 0;
    const totalMinutes = memberAttendance.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const absentDays = relevantDays - thisMonthDays;
    const joinDate = memberData?.joinDate ? parseISO(memberData.joinDate) : today;
    const daysSinceJoining = differenceInDays(today, joinDate);
    return { totalDaysPresent, thisMonthDays, attendanceRate, avgDuration, totalHours, absentDays, daysSinceJoining };
  }, [memberAttendance, thisMonthAttendance, memberData, currentMonth]);

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0) return 'Zero';
    const convertLess = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLess(n % 100) : '');
    };
    if (num < 1000) return convertLess(num);
    if (num < 100000) return convertLess(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convertLess(num % 1000) : '');
    return convertLess(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  };

  const downloadUserReceipt = (due: typeof memberDues[0]) => {
    const amount = Number(due.amount) || 0;
    const periodStart = due.periodStart ? parseISO(due.periodStart) : null;
    const periodEnd = due.periodEnd ? parseISO(due.periodEnd) : null;
    const periodText = periodStart && periodEnd ? `${format(periodStart, 'dd MMM')} - ${format(periodEnd, 'dd MMM yyyy')}` : 'N/A';
    const paidDateText = due.paidDate ? format(new Date(due.paidDate), 'dd MMM yyyy') : 'N/A';
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 25;
    pdf.setFontSize(22); pdf.setTextColor(249, 115, 22);
    pdf.text('Shri Hanumant Library', pageWidth / 2, yPos, { align: 'center' }); yPos += 8;
    pdf.setFontSize(10); pdf.setTextColor(102, 102, 102);
    pdf.text('74XH+3HW, Ramuvapur, Mahmudabad, Uttar Pradesh 261203', pageWidth / 2, yPos, { align: 'center' }); yPos += 5;
    pdf.text('Phone: +91 79913 04874 | Email: info@shrihanumantlibrary.com', pageWidth / 2, yPos, { align: 'center' }); yPos += 10;
    pdf.setDrawColor(249, 115, 22); pdf.setLineWidth(1);
    pdf.line(margin, yPos, pageWidth - margin, yPos); yPos += 15;
    pdf.setFontSize(18); pdf.setTextColor(51, 51, 51);
    pdf.text('PAYMENT RECEIPT', pageWidth / 2, yPos, { align: 'center' }); yPos += 12;
    pdf.setFillColor(255, 247, 237); pdf.setDrawColor(249, 115, 22); pdf.setLineWidth(0.5);
    const boxW = 80, boxX = (pageWidth - boxW) / 2;
    pdf.roundedRect(boxX, yPos - 6, boxW, 14, 3, 3, 'FD');
    pdf.setFontSize(14); pdf.setTextColor(234, 88, 12);
    pdf.text(due.receiptNumber || 'N/A', pageWidth / 2, yPos + 3, { align: 'center' }); yPos += 20;
    const col1X = margin + 8, col2X = pageWidth / 2 + 5;
    pdf.setFillColor(250, 250, 250); pdf.setDrawColor(229, 229, 229);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'FD'); yPos += 8;
    pdf.setFontSize(10); pdf.setTextColor(136, 136, 136);
    pdf.text('MEMBER DETAILS', col1X, yPos); yPos += 8;
    pdf.setFontSize(9); pdf.setTextColor(136, 136, 136);
    pdf.text('Member Name', col1X, yPos); pdf.text('Email Address', col2X, yPos); yPos += 5;
    pdf.setFontSize(11); pdf.setTextColor(26, 26, 26);
    pdf.text(memberData?.name || '', col1X, yPos); pdf.text(memberData?.email || 'N/A', col2X, yPos); yPos += 10;
    pdf.setFontSize(9); pdf.setTextColor(136, 136, 136);
    pdf.text('Phone Number', col1X, yPos); pdf.text('Member ID', col2X, yPos); yPos += 5;
    pdf.setFontSize(11); pdf.setTextColor(26, 26, 26);
    pdf.text(memberData?.phone || 'N/A', col1X, yPos); pdf.text(memberData?.id?.slice(0, 8).toUpperCase() || 'N/A', col2X, yPos); yPos += 15;
    pdf.setFillColor(250, 250, 250); pdf.setDrawColor(229, 229, 229);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'FD'); yPos += 8;
    pdf.setFontSize(10); pdf.setTextColor(136, 136, 136);
    pdf.text('PAYMENT DETAILS', col1X, yPos); yPos += 8;
    pdf.setFontSize(9); pdf.setTextColor(136, 136, 136);
    pdf.text('Fee Period', col1X, yPos); pdf.text('Payment Date', col2X, yPos); yPos += 5;
    pdf.setFontSize(11); pdf.setTextColor(26, 26, 26);
    pdf.text(periodText, col1X, yPos); pdf.text(paidDateText, col2X, yPos); yPos += 10;
    pdf.setFontSize(9); pdf.setTextColor(136, 136, 136);
    pdf.text('Payment Method', col1X, yPos); pdf.text('Status', col2X, yPos); yPos += 5;
    pdf.setFontSize(11); pdf.setTextColor(26, 26, 26);
    pdf.text('Cash / Online', col1X, yPos);
    pdf.setTextColor(22, 163, 74); pdf.text('Paid', col2X, yPos); yPos += 18;
    pdf.setFillColor(249, 115, 22);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 4, 4, 'F'); yPos += 10;
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(11);
    pdf.text('TOTAL AMOUNT PAID', pageWidth / 2, yPos, { align: 'center' }); yPos += 12;
    pdf.setFontSize(28);
    pdf.text(`Rs. ${amount.toLocaleString('en-IN')}`, pageWidth / 2, yPos, { align: 'center' }); yPos += 10;
    pdf.setFontSize(10);
    pdf.text(`Rupees ${numberToWords(amount)} Only`, pageWidth / 2, yPos, { align: 'center' }); yPos += 25;
    const sigY = yPos + 20;
    pdf.setTextColor(51, 51, 51); pdf.setDrawColor(51, 51, 51); pdf.setLineWidth(0.3);
    pdf.line(margin + 10, sigY, margin + 70, sigY);
    pdf.line(pageWidth - margin - 70, sigY, pageWidth - margin - 10, sigY);
    pdf.setFontSize(9); pdf.setTextColor(102, 102, 102);
    pdf.text('Member Signature', margin + 40, sigY + 6, { align: 'center' });
    pdf.text('Authorized Signature', pageWidth - margin - 40, sigY + 6, { align: 'center' });
    yPos = sigY + 20;
    pdf.setDrawColor(229, 229, 229); pdf.setLineWidth(0.3);
    pdf.line(margin, yPos, pageWidth - margin, yPos); yPos += 8;
    pdf.setFontSize(10); pdf.setTextColor(102, 102, 102);
    pdf.text('Thank you for being a valued member of Shri Hanumant Library!', pageWidth / 2, yPos, { align: 'center' }); yPos += 5;
    pdf.setFontSize(8);
    pdf.text('This is a computer-generated receipt and does not require a physical signature.', pageWidth / 2, yPos, { align: 'center' }); yPos += 4;
    pdf.text('For any queries, please contact us at +91 79913 04874', pageWidth / 2, yPos, { align: 'center' });
    pdf.save(`Receipt-${due.receiptNumber}.pdf`);
  };

  const verifyAndRun = async (action: () => Promise<void>, actionName: string) => {
    setLocationChecking(true);
    try {
      const result = await verifyLibraryLocation();
      if (!result.allowed) {
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.error(`You are ${result.distance}m away from the library. You must be within 150m to mark ${actionName}.`);
        }
        return;
      }
      await action();
    } finally {
      setLocationChecking(false);
    }
  };

  const handleMarkEntry = async () => {
    if (!memberData) return;
    await verifyAndRun(async () => {
      try {
        await markEntry(memberData.id, memberData.name);
        toast.success('Entry marked successfully!');
      } catch (error) { toast.error('Failed to mark entry'); }
    }, 'entry');
  };

  const handleMarkExit = async () => {
    if (!memberData || !currentSession) return;
    await verifyAndRun(async () => {
      try {
        await markExit(currentSession.id, memberData.id, memberData.name, currentSession.entryTime);
        toast.success('Exit marked successfully!');
      } catch (error) { toast.error('Failed to mark exit'); }
    }, 'exit');
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
      await updateDoc(doc(firestore, 'members', memberData.id), { profilePic: compressedImage });
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
          <p className="text-muted-foreground mb-6">Your member account could not be found. Please contact the library admin.</p>
          <Button onClick={handleLogout} variant="outline">Back to Login</Button>
        </div>
      </div>
    );
  }

  const DashboardHome = () => (
    <div className="container mx-auto px-4 py-6 sm:py-8">
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
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
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
                  disabled={locationChecking}
                >
                  {locationChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOutIcon className="w-4 h-4" />}
                  {locationChecking ? 'Verifying...' : 'Mark Exit'}
                </Button>
              </div>
            ) : (
              <Button onClick={handleMarkEntry} className="w-full sm:w-auto btn-primary gap-2" size="lg" disabled={locationChecking}>
                {locationChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                {locationChecking ? 'Verifying Location...' : 'Mark Entry'}
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
          <p className="text-xl sm:text-2xl font-bold text-success">{analytics.attendanceRate}%</p>
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
          <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.totalHours}h</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="stat-card border-l-4 border-warning">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <span className="text-muted-foreground">Total Pending Dues</span>
          </div>
          <p className="text-2xl font-bold text-warning">₹{totalPending}</p>
          <p className="text-sm text-muted-foreground">{pendingMemberDues.length} due{pendingMemberDues.length !== 1 ? 's' : ''} pending</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-muted-foreground">Total Fee Paid</span>
          </div>
          <p className="text-2xl font-bold text-success">₹{totalPaid}</p>
          <p className="text-sm text-muted-foreground">{paidDues.length} payment{paidDues.length !== 1 ? 's' : ''} made</p>
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
          <p className="text-sm text-muted-foreground">{format(currentMonth, 'MMMM')}</p>
        </div>
      </div>


      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Attendance Calendar */}
        <div className="card-elevated p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground">
              {format(currentMonth, 'MMMM yyyy')} Attendance
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              disabled={format(addMonths(currentMonth, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">{day}</div>
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
                    isFuture ? 'bg-secondary/30 text-muted-foreground/50'
                      : isPresent ? 'bg-success/20 text-success'
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
          <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Recent Activity</h3>
          {memberAttendance.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No attendance records yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {memberAttendance.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${record.exitTime ? 'bg-muted-foreground' : 'bg-success'}`} />
                    <div>
                      <p className="font-medium text-foreground text-sm">{format(parseISO(record.date), 'dd MMM yyyy')}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{record.entryTime} - {record.exitTime || 'In Progress'}</p>
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
          <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Fee History</h3>
          {memberDues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No fee records yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm">Period</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm">Amount</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm hidden sm:table-cell">Due Date</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm">Status</th>
                     <th className="text-right p-2 sm:p-3 font-medium text-muted-foreground text-sm w-10"></th>
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
                           due.status === 'paid' ? 'bg-success/10 text-success'
                             : due.status === 'overdue' ? 'bg-destructive/10 text-destructive'
                             : 'bg-warning/10 text-warning'
                         }`}>
                           {due.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                           {due.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                           {due.status === 'pending' && <Clock className="w-3 h-3" />}
                           {due.status}
                         </span>
                       </td>
                       <td className="p-2 sm:p-3 text-right">
                         {due.status === 'paid' && due.receiptNumber && (
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7"
                             onClick={() => downloadUserReceipt(due)}
                           >
                             <Download className="w-3.5 h-3.5" />
                           </Button>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <UserLayout
      memberData={memberData}
      onOpenChat={() => setShowChat(true)}
      chatEnabled={chatEnabled}
    >
      {showChat && memberData && (
        <ChatModule memberId={memberData.id} memberName={memberData.name} onClose={() => setShowChat(false)} />
      )}

      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="leaderboard" element={<LeaderboardPage currentMemberId={memberData.id} />} />
        <Route path="streaks" element={<StreaksPage memberId={memberData.id} />} />
        <Route path="timer" element={<StudyTimerPage memberId={memberData.id} currentSession={currentSession} />} />
      </Routes>
    </UserLayout>
  );
};

export default UserDashboard;
