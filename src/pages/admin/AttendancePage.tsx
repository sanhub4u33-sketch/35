import { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon,
  Clock,
  User,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMembers, useAttendance } from '@/hooks/useFirebaseData';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'month';

const AttendancePage = () => {
  const { members } = useMembers();
  const { attendance, getMemberAttendance } = useAttendance();
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter attendance based on view mode
  const filteredAttendance = useMemo(() => {
    let filtered = attendance;
    
    if (selectedMember !== 'all') {
      filtered = getMemberAttendance(selectedMember);
    }

    if (viewMode === 'day') {
      // Filter by selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(record => record.date === dateStr);
    } else {
      // Filter by month
      const monthStr = format(currentMonth, 'yyyy-MM');
      filtered = filtered.filter(record => record.date?.startsWith(monthStr));
    }

    if (searchQuery) {
      filtered = filtered.filter(record =>
        record.memberName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by entry time (most recent first)
    return filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.entryTime.localeCompare(a.entryTime);
    });
  }, [attendance, selectedMember, currentMonth, selectedDate, viewMode, searchQuery, getMemberAttendance]);

  const getMemberAttendanceForDay = (memberId: string, date: Date) => {
    return attendance.find(record => 
      record.memberId === memberId && 
      isSameDay(parseISO(record.date), date)
    );
  };

  const selectedMemberData = selectedMember !== 'all' 
    ? members.find(m => m.id === selectedMember) 
    : null;

  const totalDaysPresent = selectedMember !== 'all'
    ? new Set(getMemberAttendance(selectedMember)
        .filter(r => r.date.startsWith(format(currentMonth, 'yyyy-MM')))
        .map(r => r.date)
      ).size
    : 0;

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setViewMode('day');
    }
  };

  // Export functions
  const exportToExcel = () => {
    if (filteredAttendance.length === 0) {
      return;
    }

    const title = viewMode === 'day' 
      ? `Attendance - ${format(selectedDate, 'dd MMM yyyy')}`
      : `Attendance - ${format(currentMonth, 'MMMM yyyy')}`;
    
    const headers = ['Date', 'Member', 'Entry Time', 'Exit Time', 'Duration'];
    const rows = filteredAttendance.map(record => [
      format(parseISO(record.date), 'dd MMM yyyy'),
      record.memberName,
      record.entryTime,
      record.exitTime || 'In Library',
      record.duration ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m` : '-'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${viewMode === 'day' ? format(selectedDate, 'yyyy-MM-dd') : format(currentMonth, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  const exportToPDF = () => {
    if (filteredAttendance.length === 0) {
      return;
    }

    const title = viewMode === 'day' 
      ? `Attendance Report - ${format(selectedDate, 'dd MMMM yyyy')}`
      : `Attendance Report - ${format(currentMonth, 'MMMM yyyy')}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #f97316; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .header h1 { 
              color: #f97316; 
              font-size: 28px;
              margin-bottom: 5px;
            }
            .header p { color: #666; font-size: 14px; }
            .title { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 20px;
              color: #333;
            }
            .stats {
              display: flex;
              gap: 20px;
              margin-bottom: 20px;
            }
            .stat {
              padding: 10px 15px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .stat-label { font-size: 12px; color: #666; }
            .stat-value { font-size: 18px; font-weight: bold; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 14px; }
            th { background-color: #f97316; color: white; font-weight: 600; }
            tr:nth-child(even) { background-color: #fafafa; }
            .in-library { color: #f59e0b; font-weight: 500; }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              color: #888; 
              font-size: 12px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Shri Hanumant Library</h1>
            <p>74XH+3HW, Ramuvapur, Mahmudabad, UP 261203</p>
            <p>Phone: +91 79913 04874</p>
          </div>
          
          <div class="title">${title}</div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAttendance.map(record => `
                <tr>
                  <td>${format(parseISO(record.date), 'dd MMM yyyy')}</td>
                  <td>${record.memberName}</td>
                  <td>${record.entryTime}</td>
                  <td>${record.exitTime ? record.exitTime : '<span class="in-library">In Library</span>'}</td>
                  <td>${record.duration ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m` : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            <p>This is a computer-generated report.</p>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setShowExportDialog(false);
  };

  return (
    <AdminLayout 
      title="Attendance" 
      searchPlaceholder="Search by name..."
      onSearch={setSearchQuery}
    >
      {/* View Mode and Filters */}
      <div className="card-elevated p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border border-border rounded-lg p-1">
            <Button 
              variant={viewMode === 'day' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>

          {/* Date Picker */}
          {viewMode === 'day' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-[180px] justify-start">
                  <CalendarIcon className="w-4 h-4" />
                  {format(selectedDate, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Month Navigation */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4 py-2 bg-secondary rounded-lg min-w-[180px] text-center">
                <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Member Filter */}
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button 
            variant="outline" 
            onClick={() => setShowExportDialog(true)} 
            className="gap-2"
            disabled={filteredAttendance.length === 0}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Quick info */}
        <div className="mt-4 text-sm text-muted-foreground">
          {viewMode === 'day' 
            ? isToday(selectedDate) 
              ? "Today's attendance" 
              : `Attendance for ${format(selectedDate, 'dd MMM yyyy')}`
            : `${format(currentMonth, 'MMMM yyyy')} attendance`
          }
        </div>
      </div>

      {/* Individual Member Calendar View (only in month mode) */}
      {viewMode === 'month' && selectedMember !== 'all' && selectedMemberData && (
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold">
                {selectedMemberData.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">{selectedMemberData.name}</h3>
                <p className="text-muted-foreground">{selectedMemberData.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{totalDaysPresent}</p>
              <p className="text-sm text-muted-foreground">Days Present</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {daysInMonth.map((day) => {
              const record = getMemberAttendanceForDay(selectedMember, day);
              const isPresent = !!record;
              const isTodayDate = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 rounded-lg text-center text-sm cursor-pointer transition-colors ${
                    isPresent 
                      ? 'bg-success/20 text-success hover:bg-success/30' 
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  } ${isTodayDate ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => {
                    setSelectedDate(day);
                    setViewMode('day');
                  }}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                  {record && (
                    <p className="text-xs mt-1">{record.entryTime.slice(0, 5)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Member</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Entry Time</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Exit Time</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {viewMode === 'day' 
                      ? `No attendance records for ${format(selectedDate, 'dd MMM yyyy')}`
                      : 'No attendance records found'
                    }
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="p-4">{format(parseISO(record.date), 'dd MMM yyyy')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                          {record.memberName.charAt(0)}
                        </div>
                        {record.memberName}
                      </div>
                    </td>
                    <td className="p-4 text-success">{record.entryTime}</td>
                    <td className="p-4">{record.exitTime || <span className="text-warning">In Library</span>}</td>
                    <td className="p-4">
                      {record.duration 
                        ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m`
                        : '-'
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Export Attendance</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Exporting {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''} for{' '}
              {viewMode === 'day' 
                ? format(selectedDate, 'dd MMM yyyy')
                : format(currentMonth, 'MMMM yyyy')
              }
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={exportToPDF}
              >
                <FileText className="w-8 h-8 text-destructive" />
                <span>PDF</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={exportToExcel}
              >
                <FileSpreadsheet className="w-8 h-8 text-success" />
                <span>Excel</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AttendancePage;
