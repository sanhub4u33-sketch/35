import { useState, useMemo } from 'react';
import { 
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  IndianRupee,
  Calendar as CalendarIcon
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDues, useMembers } from '@/hooks/useFirebaseData';
import { toast } from 'sonner';
import { format, parseISO, subDays, subWeeks, subMonths, subYears, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

type ExportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const DuesPage = () => {
  const { dues, loading, recordPayment } = useDues();
  const { members } = useMembers();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('monthly');
  const [searchQuery, setSearchQuery] = useState('');

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    memberId: '',
    periodStart: undefined as Date | undefined,
    periodEnd: undefined as Date | undefined,
    amount: '',
    paymentDate: undefined as Date | undefined,
  });

  const filteredDues = useMemo(() => {
    let filtered = dues;

    if (searchQuery) {
      filtered = filtered.filter(due =>
        due.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        due.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [dues, searchQuery]);

  const stats = useMemo(() => {
    const totalPayments = dues.length;
    const totalAmount = dues.reduce((sum, d) => sum + d.amount, 0);
    const thisMonth = dues.filter(d => {
      if (!d.paidDate) return false;
      const paidMonth = d.paidDate.substring(0, 7);
      const currentMonth = new Date().toISOString().substring(0, 7);
      return paidMonth === currentMonth;
    });
    const thisMonthAmount = thisMonth.reduce((sum, d) => sum + d.amount, 0);

    return { totalPayments, totalAmount, thisMonthPayments: thisMonth.length, thisMonthAmount };
  }, [dues]);

  const selectedMember = members.find(m => m.id === newPayment.memberId);

  const handleOpenAddPayment = () => {
    setNewPayment({
      memberId: '',
      periodStart: undefined,
      periodEnd: undefined,
      amount: '',
      paymentDate: new Date(), // Default to today
    });
    setShowAddPaymentDialog(true);
  };

  const handleProceedToConfirm = () => {
    if (!newPayment.memberId || !newPayment.periodStart || !newPayment.periodEnd || !newPayment.amount || !newPayment.paymentDate) {
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

    if (!selectedMember || !newPayment.periodStart || !newPayment.periodEnd || !newPayment.paymentDate) return;

    try {
      const receiptNumber = await recordPayment({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        periodStart: format(newPayment.periodStart, 'yyyy-MM-dd'),
        periodEnd: format(newPayment.periodEnd, 'yyyy-MM-dd'),
        amount: Number(newPayment.amount),
        paymentDate: format(newPayment.paymentDate, 'yyyy-MM-dd'),
      });
      toast.success(`Payment recorded. Receipt: ${receiptNumber}`);
      setShowPasswordDialog(false);
      setShowAddPaymentDialog(false);
      setPasswordInput('');
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  // Transaction History Export Functions
  const getFilteredTransactions = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = subDays(now, 1);
        break;
      case 'weekly':
        startDate = subWeeks(now, 1);
        break;
      case 'monthly':
        startDate = subMonths(now, 1);
        break;
      case 'yearly':
        startDate = subYears(now, 1);
        break;
    }

    return dues.filter(due => 
      due.paidDate && 
      isAfter(parseISO(due.paidDate), startDate)
    );
  };

  const exportToExcel = () => {
    const now = new Date();
    const paidInPeriod = getFilteredTransactions(exportPeriod);

    if (paidInPeriod.length === 0) {
      toast.error(`No transactions found for ${exportPeriod} period`);
      return;
    }

    // Create CSV
    const headers = ['Receipt No', 'Member Name', 'Period', 'Amount', 'Paid Date'];
    const rows = paidInPeriod.map(due => [
      due.receiptNumber || '',
      due.memberName,
      due.periodStart && due.periodEnd 
        ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM yyyy')}`
        : 'N/A',
      `Rs. ${Number(due.amount).toLocaleString('en-IN')}`,
      due.paidDate ? format(parseISO(due.paidDate), 'dd MMM yyyy') : ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_transactions_${exportPeriod}_${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1)} Excel report downloaded`);
    setShowExportDialog(false);
  };

  const exportToPDF = async () => {
    const now = new Date();
    const paidInPeriod = getFilteredTransactions(exportPeriod);

    if (paidInPeriod.length === 0) {
      toast.error(`No transactions found for ${exportPeriod} period`);
      return;
    }

    const totalAmount = paidInPeriod.reduce((sum, due) => sum + Number(due.amount), 0);
    const periodLabel = exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1);

    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(249, 115, 22);
    pdf.text('Shri Hanumant Library', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    pdf.text('74XH+3HW, Ramuvapur, Mahmudabad, UP 261203', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    pdf.text('Phone: +91 79913 04874', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Orange line
    pdf.setDrawColor(249, 115, 22);
    pdf.setLineWidth(0.8);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    // Title
    pdf.setFontSize(14);
    pdf.setTextColor(51, 51, 51);
    pdf.text(`Fee Transactions Report - ${periodLabel}`, margin, yPos);
    yPos += 6;
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    pdf.text(`Generated: ${format(now, 'dd MMM yyyy, hh:mm a')}`, margin, yPos);
    yPos += 12;

    // Table Header
    const colWidths = [30, 45, 40, 35, 30];
    const headers = ['Receipt No', 'Member', 'Period', 'Amount', 'Paid Date'];
    
    pdf.setFillColor(249, 115, 22);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    
    let xPos = margin + 3;
    headers.forEach((header, i) => {
      pdf.text(header, xPos, yPos + 1);
      xPos += colWidths[i];
    });
    yPos += 10;

    // Table Rows
    pdf.setTextColor(51, 51, 51);
    paidInPeriod.forEach((due, index) => {
      if (yPos > 260) {
        pdf.addPage();
        yPos = 20;
      }

      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
      }

      xPos = margin + 3;
      pdf.setFontSize(9);
      pdf.text(due.receiptNumber || '-', xPos, yPos);
      xPos += colWidths[0];
      pdf.text(due.memberName.slice(0, 18), xPos, yPos);
      xPos += colWidths[1];
      const periodText = due.periodStart && due.periodEnd 
        ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM')}`
        : 'N/A';
      pdf.text(periodText, xPos, yPos);
      xPos += colWidths[2];
      pdf.text(`Rs. ${Number(due.amount).toLocaleString('en-IN')}`, xPos, yPos);
      xPos += colWidths[3];
      pdf.text(due.paidDate ? format(parseISO(due.paidDate), 'dd MMM yyyy') : '-', xPos, yPos);
      
      yPos += 8;
    });

    // Total
    yPos += 5;
    pdf.setFillColor(255, 247, 237);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 12, 'F');
    pdf.setFontSize(12);
    pdf.setTextColor(51, 51, 51);
    pdf.text(`Total: Rs. ${totalAmount.toLocaleString('en-IN')} (${paidInPeriod.length} transactions)`, margin + 5, yPos + 2);
    yPos += 15;

    // Footer
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(136, 136, 136);
    pdf.text('This is a computer-generated report.', pageWidth / 2, yPos, { align: 'center' });

    // Save PDF directly
    pdf.save(`fee_transactions_${exportPeriod}_${format(now, 'yyyy-MM-dd')}.pdf`);
    toast.success(`${periodLabel} PDF report downloaded`);
    setShowExportDialog(false);
  };

  return (
    <AdminLayout 
      title="Fee Management" 
      searchPlaceholder="Search member or receipt..."
      onSearch={setSearchQuery}
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-muted-foreground">Total Payments</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalPayments}</p>
          <p className="text-sm text-success">₹{stats.totalAmount.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <IndianRupee className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.thisMonthPayments}</p>
          <p className="text-sm text-primary">₹{stats.thisMonthAmount.toLocaleString()}</p>
        </div>

        <div className="stat-card flex items-center justify-center">
          <Button onClick={handleOpenAddPayment} className="btn-primary gap-2">
            <Plus className="w-5 h-5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
        <Button 
          variant="outline" 
          onClick={() => setShowExportDialog(true)} 
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Payments List */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Receipt No</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Member</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Period</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No payments recorded yet
                  </td>
                </tr>
              ) : (
                filteredDues.map((due) => (
                  <tr key={due.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="p-4 font-mono text-sm">{due.receiptNumber || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                          {due.memberName.charAt(0)}
                        </div>
                        {due.memberName}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {due.periodStart && due.periodEnd 
                        ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM yyyy')}`
                        : 'Period not set'}
                    </td>
                    <td className="p-4 font-semibold text-success">₹{due.amount}</td>
                    <td className="p-4">{due.paidDate ? format(parseISO(due.paidDate), 'dd MMM yyyy') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Record New Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Member Selection */}
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={newPayment.memberId} onValueChange={(v) => setNewPayment({ ...newPayment, memberId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.status === 'active').map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  <Calendar
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
                  <Calendar
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

            {selectedMember && (
              <p className="text-sm text-muted-foreground">
                Default monthly fee: ₹{selectedMember.monthlyFee}
              </p>
            )}

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newPayment.paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newPayment.paymentDate ? format(newPayment.paymentDate, "PPP") : "Select payment date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newPayment.paymentDate}
                    onSelect={(date) => setNewPayment({ ...newPayment, paymentDate: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
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

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Export Fee Transactions</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Period Selection */}
            <div className="space-y-2">
              <Label>Select Period</Label>
              <Select value={exportPeriod} onValueChange={(v) => setExportPeriod(v as ExportPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (Last 24 hours)</SelectItem>
                  <SelectItem value="weekly">Weekly (Last 7 days)</SelectItem>
                  <SelectItem value="monthly">Monthly (Last 30 days)</SelectItem>
                  <SelectItem value="yearly">Yearly (Last 365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {getFilteredTransactions(exportPeriod).length} transaction{getFilteredTransactions(exportPeriod).length !== 1 ? 's' : ''} in this period
            </p>
            
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Choose Format</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={exportToPDF}
                  disabled={getFilteredTransactions(exportPeriod).length === 0}
                >
                  <FileText className="w-8 h-8 text-destructive" />
                  <span>PDF</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col gap-2"
                  onClick={exportToExcel}
                  disabled={getFilteredTransactions(exportPeriod).length === 0}
                >
                  <FileSpreadsheet className="w-8 h-8 text-success" />
                  <span>Excel</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Payment</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {selectedMember && newPayment.periodStart && newPayment.periodEnd && newPayment.paymentDate && (
              <div className="p-3 bg-secondary/50 rounded-lg space-y-1 text-sm">
                <p><span className="text-muted-foreground">Member:</span> <span className="font-semibold">{selectedMember.name}</span></p>
                <p><span className="text-muted-foreground">Period:</span> {format(newPayment.periodStart, 'dd MMM yyyy')} - {format(newPayment.periodEnd, 'dd MMM yyyy')}</p>
                <p><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-success">₹{newPayment.amount}</span></p>
                <p><span className="text-muted-foreground">Payment Date:</span> {format(newPayment.paymentDate, 'dd MMM yyyy')}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="payment-password">Enter Password</Label>
              <Input
                id="payment-password"
                type="password"
                placeholder="Enter password to confirm"
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
            <Button onClick={handleConfirmPayment} className="btn-primary">
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DuesPage;
