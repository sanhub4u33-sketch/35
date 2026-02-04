import { useState, useMemo } from 'react';
import { 
  X, 
  Edit, 
  Save, 
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Member, FeeRecord, AttendanceRecord } from '@/types/library';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { ref, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface MemberDetailModalProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberDues: FeeRecord[];
  memberAttendance: AttendanceRecord[];
  onMarkAsPaid?: (dueId: string, memberId: string, memberName: string, amount: number, periodEnd: string) => Promise<string>;
}

const MemberDetailModal = ({ 
  member, 
  open, 
  onOpenChange,
  memberDues,
  memberAttendance,
  onMarkAsPaid
}: MemberDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    email: '',
    password: '',
    phone: '',
    address: '',
    seatNumber: '',
    monthlyFee: 500,
  });
  const [currentMonth] = useState(new Date());
  const [sendingReset, setSendingReset] = useState(false);
  const [payingDueId, setPayingDueId] = useState<string | null>(null);

  // Calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const safeParseISO = (value?: string) => {
    if (!value) return null;
    try {
      return parseISO(value);
    } catch {
      return null;
    }
  };

  const getAttendanceForDay = (date: Date) => {
    return memberAttendance.find(record => 
      (() => {
        const recordDate = safeParseISO(record.date);
        return recordDate ? isSameDay(recordDate, date) : false;
      })()
    );
  };

  // Stats calculations
  const stats = useMemo(() => {
    const thisMonthAttendance = memberAttendance.filter(
      a => a.date.startsWith(format(currentMonth, 'yyyy-MM'))
    );
    
    const totalDaysPresent = new Set(memberAttendance.map(a => a.date)).size;
    const thisMonthDays = new Set(thisMonthAttendance.map(a => a.date)).size;
    
    // Calculate average time spent
    const sessionsWithDuration = memberAttendance.filter(a => a.duration);
    const avgDuration = sessionsWithDuration.length > 0 
      ? Math.round(sessionsWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / sessionsWithDuration.length)
      : 0;
    
    const pendingFees = memberDues.filter(d => d.status === 'pending' || d.status === 'overdue');
    const paidFees = memberDues.filter(d => d.status === 'paid');
    const totalPending = pendingFees.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = paidFees.reduce((sum, d) => sum + d.amount, 0);

    return {
      totalDaysPresent,
      thisMonthDays,
      avgDuration,
      pendingFees: pendingFees.length,
      totalPending,
      totalPaid,
      paidFees: paidFees.length,
    };
  }, [memberAttendance, memberDues, currentMonth]);

  const handleEdit = () => {
    if (!member) return;
    setEditData({
      email: member.email,
      password: member.password || '',
      phone: member.phone,
      address: member.address || '',
      seatNumber: member.seatNumber || '',
      monthlyFee: member.monthlyFee,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    try {
      // IMPORTANT: Updating another user's Firebase Auth email/password from the client is not reliable/secure.
      // We only update the member profile fields in the database, and use password-reset email for credential changes.
      const memberRef = ref(database, `members/${member.id}`);
      await update(memberRef, {
        // keep email editable for profile/reference, but it does not guarantee Auth email changes
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        seatNumber: editData.seatNumber,
        monthlyFee: editData.monthlyFee,
      });

      toast.success('Member updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast.error(error.message || 'Failed to update member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReset = async () => {
    if (!member?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, member.email);
      toast.success(`Password reset link sent to ${member.email}`);
    } catch (e: any) {
      console.error('Password reset email failed:', e);
      toast.error(e?.message || 'Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const handlePayDue = async (due: FeeRecord) => {
    if (!member || !onMarkAsPaid) return;
    setPayingDueId(due.id);
    try {
      const receiptNumber = await onMarkAsPaid(due.id, member.id, member.name, due.amount, due.periodEnd);
      toast.success(`Payment recorded! Receipt: ${receiptNumber}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setPayingDueId(null);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between">
            <span>Member Details</span>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 btn-primary">
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
            <div className="w-20 h-20 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-3xl font-bold">
              {member.profilePic ? (
                <img src={member.profilePic} alt={member.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-foreground">{member.name}</h2>
              <p className="text-muted-foreground">
                Member since {safeParseISO(member.joinDate) ? format(parseISO(member.joinDate), 'MMMM d, yyyy') : 'N/A'}
              </p>
              <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full ${
                member.status === 'active' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {member.status}
              </span>
            </div>
          </div>

          {/* Profile Details */}
          {/* Credential note */}
          {isEditing && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  Member login password can’t be changed securely from the admin panel in this build.
                  Use <span className="font-medium">Reset Password</span> to send a reset link.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleSendReset}
                  disabled={sendingReset}
                >
                  {sendingReset ? 'Sending...' : 'Reset Password (Email)'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label>Email</Label>
              <p className="p-2 bg-secondary/30 rounded-lg">{member.email}</p>
              {isEditing && (
                <p className="text-xs text-muted-foreground">Email cannot be changed from admin panel</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <p className="p-2 bg-secondary/30 rounded-lg font-mono">••••••••</p>
              {isEditing && (
                <p className="text-xs text-muted-foreground">Use "Reset Password" button above</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              {isEditing ? (
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              ) : (
                <p className="p-2 bg-secondary/30 rounded-lg">{member.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Seat Number</Label>
              {isEditing ? (
                <Input
                  value={editData.seatNumber}
                  onChange={(e) => setEditData({ ...editData, seatNumber: e.target.value })}
                />
              ) : (
                <p className="p-2 bg-secondary/30 rounded-lg">{member.seatNumber || 'N/A'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Monthly Fee</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.monthlyFee}
                  onChange={(e) => setEditData({ ...editData, monthlyFee: Number(e.target.value) })}
                />
              ) : (
                <p className="p-2 bg-secondary/30 rounded-lg">₹{member.monthlyFee}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              {isEditing ? (
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              ) : (
                <p className="p-2 bg-secondary/30 rounded-lg">{member.address || 'N/A'}</p>
              )}
            </div>
          </div>

          {/* Analytics Widgets */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Days</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalDaysPresent}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm text-muted-foreground">Avg. Time</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Math.floor(stats.avgDuration / 60)}h {stats.avgDuration % 60}m
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm text-muted-foreground">Fees Paid</span>
              </div>
              <p className="text-2xl font-bold text-success">₹{stats.totalPaid}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold text-warning">₹{stats.totalPending}</p>
            </div>
          </div>

          {/* Attendance Calendar */}
          <div className="p-4 bg-secondary/30 rounded-xl">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
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
                    className={`p-1 sm:p-2 rounded-lg text-center text-xs sm:text-sm ${
                      isFuture 
                        ? 'bg-secondary/30 text-muted-foreground/50'
                        : isPresent 
                          ? 'bg-success/20 text-success' 
                          : 'bg-secondary/50 text-muted-foreground'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                    title={record ? `Entry: ${record.entryTime}${record.exitTime ? `, Exit: ${record.exitTime}` : ''}` : ''}
                  >
                    <span className="font-medium">{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fee History */}
          <div className="p-4 bg-secondary/30 rounded-xl">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Fee History
            </h3>

            {memberDues.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No fee records</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {memberDues.map((due) => (
                  <div 
                    key={due.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {due.periodStart && due.periodEnd && safeParseISO(due.periodStart) && safeParseISO(due.periodEnd)
                          ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM yyyy')}`
                          : 'Period not set'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {due.dueDate && safeParseISO(due.dueDate) ? format(parseISO(due.dueDate), 'dd MMM yyyy') : 'Not set'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{due.amount}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        due.status === 'paid' 
                          ? 'bg-success/10 text-success'
                          : due.status === 'overdue'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-warning/10 text-warning'
                      }`}>
                        {due.status}
                      </span>
                    </div>
                    {(due.status === 'pending' || due.status === 'overdue') && onMarkAsPaid && (
                      <Button
                        size="sm"
                        className="btn-primary"
                        disabled={payingDueId === due.id}
                        onClick={() => handlePayDue(due)}
                      >
                        {payingDueId === due.id ? 'Paying...' : 'Pay'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailModal;