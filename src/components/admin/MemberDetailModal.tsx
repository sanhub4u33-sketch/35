import { useState, useMemo } from 'react';
import { 
  Edit, 
  Save, 
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Plus,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Member, FeeRecord, AttendanceRecord } from '@/types/library';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { ref, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';

interface MemberDetailModalProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberDues: FeeRecord[];
  memberAttendance: AttendanceRecord[];
  onRecordPayment?: (payment: {
    memberId: string;
    memberName: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
  }) => Promise<string>;
}

const MemberDetailModal = ({ 
  member, 
  open, 
  onOpenChange,
  memberDues,
  memberAttendance,
  onRecordPayment
}: MemberDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    email: '',
    password: '',
    phone: '',
    address: '',
    seatNumber: '',
    lockerNumber: '',
    monthlyFee: 500,
  });
  const [currentMonth] = useState(new Date());
  const [sendingReset, setSendingReset] = useState(false);
  
  // Add payment dialog state
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPayment, setNewPayment] = useState({
    periodStart: undefined as Date | undefined,
    periodEnd: undefined as Date | undefined,
    amount: '',
  });
  const [isRecording, setIsRecording] = useState(false);

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
    
    const totalPaid = memberDues.reduce((sum, d) => sum + d.amount, 0);

    return {
      totalDaysPresent,
      thisMonthDays,
      avgDuration,
      totalPaid,
      totalPayments: memberDues.length,
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
      lockerNumber: member.lockerNumber || '',
      monthlyFee: member.monthlyFee,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    try {
      const memberRef = ref(database, `members/${member.id}`);
      await update(memberRef, {
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        seatNumber: editData.seatNumber,
        lockerNumber: editData.lockerNumber,
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

  const handleOpenAddPayment = () => {
    setNewPayment({
      periodStart: undefined,
      periodEnd: undefined,
      amount: member?.monthlyFee?.toString() || '',
    });
    setShowAddPaymentDialog(true);
  };

  const handleProceedToConfirm = () => {
    if (!newPayment.periodStart || !newPayment.periodEnd || !newPayment.amount) {
      toast.error('Please fill all fields');
      return;
    }
    setPasswordInput('');
    setShowPasswordDialog(true);
  };

  const handleConfirmPayment = async () => {
    if (passwordInput !== '8090') {
      toast.error('Incorrect password');
      return;
    }

    if (!member || !onRecordPayment || !newPayment.periodStart || !newPayment.periodEnd) return;
    
    setIsRecording(true);
    try {
      const receiptNumber = await onRecordPayment({
        memberId: member.id,
        memberName: member.name,
        periodStart: format(newPayment.periodStart, 'yyyy-MM-dd'),
        periodEnd: format(newPayment.periodEnd, 'yyyy-MM-dd'),
        amount: Number(newPayment.amount),
      });
      toast.success(`Payment recorded! Receipt: ${receiptNumber}`);
      setShowPasswordDialog(false);
      setShowAddPaymentDialog(false);
      setPasswordInput('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsRecording(false);
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

          {/* Credential note */}
          {isEditing && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  Member login password can't be changed securely from the admin panel in this build.
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

          {/* Profile Details */}
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
              <Label>Locker Number</Label>
              {isEditing ? (
                <Input
                  value={editData.lockerNumber}
                  onChange={(e) => setEditData({ ...editData, lockerNumber: e.target.value })}
                />
              ) : (
                <p className="p-2 bg-secondary/30 rounded-lg">{member.lockerNumber || 'N/A'}</p>
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
                <span className="text-sm text-muted-foreground">Total Paid</span>
              </div>
              <p className="text-2xl font-bold text-success">₹{stats.totalPaid}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Payments</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalPayments}</p>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Payment History
              </h3>
              {onRecordPayment && (
                <Button size="sm" onClick={handleOpenAddPayment} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add Payment
                </Button>
              )}
            </div>

            {memberDues.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No payment records</p>
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
                        {due.receiptNumber} • {due.paidDate && safeParseISO(due.paidDate) ? format(parseISO(due.paidDate), 'dd MMM yyyy') : ''}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="font-semibold text-success">₹{due.amount}</p>
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Payment Dialog */}
        <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Record Payment for {member.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {/* Period Start Date */}
              <div className="space-y-2">
                <Label>Period Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPayment.periodStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPayment.periodStart ? format(newPayment.periodStart, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newPayment.periodStart}
                      onSelect={(date) => setNewPayment({ ...newPayment, periodStart: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Period End Date */}
              <div className="space-y-2">
                <Label>Period End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newPayment.periodEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPayment.periodEnd ? format(newPayment.periodEnd, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newPayment.periodEnd}
                      onSelect={(date) => setNewPayment({ ...newPayment, periodEnd: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleProceedToConfirm} className="btn-primary">
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Confirmation Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="font-display">Confirm Payment</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {newPayment.periodStart && newPayment.periodEnd && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Period:</span> {format(newPayment.periodStart, 'dd MMM yyyy')} - {format(newPayment.periodEnd, 'dd MMM yyyy')}</p>
                  <p><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-success">₹{newPayment.amount}</span></p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmPayment()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPayment} className="btn-primary" disabled={isRecording}>
                {isRecording ? 'Recording...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailModal;
