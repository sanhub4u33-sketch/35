import { useState, useMemo } from 'react';
import { 
  IndianRupee,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText
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
import { useMembers, useDues } from '@/hooks/useFirebaseData';
import { toast } from 'sonner';
import { format, parseISO, subDays, subWeeks, subMonths, subYears, isAfter } from 'date-fns';

type ExportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const DuesPage = () => {
  const { members } = useMembers();
  const { dues, loading, markAsPaid, createInitialFee } = useDues();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    memberId: '',
    periodStart: format(new Date(), 'yyyy-MM-dd'),
    periodEnd: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    amount: 500,
  });

  const filteredDues = useMemo(() => {
    let filtered = dues;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(due => due.status === filterStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(due =>
        due.memberName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      if (a.status === 'pending' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'pending') return 1;
      return new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime();
    });
  }, [dues, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const pending = dues.filter(d => d.status === 'pending');
    const overdue = dues.filter(d => d.status === 'overdue');
    const paid = dues.filter(d => d.status === 'paid');
    const totalPending = pending.reduce((sum, d) => sum + d.amount, 0);
    const totalOverdue = overdue.reduce((sum, d) => sum + d.amount, 0);

    return { pending, overdue, paid, totalPending, totalOverdue };
  }, [dues]);

  const handleAddDue = async () => {
    const member = members.find(m => m.id === formData.memberId);
    if (!member) {
      toast.error('Please select a member');
      return;
    }

    try {
      await createInitialFee(
        formData.memberId,
        member.name,
        formData.amount,
        formData.periodStart
      );

      toast.success('Fee added successfully');
      setShowAddDialog(false);
      setFormData({
        memberId: '',
        periodStart: format(new Date(), 'yyyy-MM-dd'),
        periodEnd: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        amount: 500,
      });
    } catch (error) {
      toast.error('Failed to add fee');
    }
  };

  const handleMarkPaid = async (dueId: string, memberId: string, memberName: string, amount: number, periodEnd: string) => {
    try {
      const receiptNumber = await markAsPaid(dueId, memberId, memberName, amount, periodEnd);
      toast.success(`Payment recorded. Receipt: ${receiptNumber}`);
    } catch (error) {
      toast.error('Failed to mark as paid');
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
      due.status === 'paid' && 
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

  const exportToPDF = () => {
    const now = new Date();
    const paidInPeriod = getFilteredTransactions(exportPeriod);

    if (paidInPeriod.length === 0) {
      toast.error(`No transactions found for ${exportPeriod} period`);
      return;
    }

    // Ensure numeric addition by converting to Number
    const totalAmount = paidInPeriod.reduce((sum, due) => sum + Number(due.amount), 0);
    const periodLabel = exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1);

    // Open new window and write content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Transactions - ${periodLabel} Report</title>
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
          .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 14px; }
          th { background-color: #f97316; color: white; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
          .total { 
            margin-top: 20px; 
            font-size: 18px; 
            font-weight: bold;
            padding: 15px;
            background: #fff7ed;
            border-radius: 8px;
          }
          .footer { 
            margin-top: 30px; 
            color: #888; 
            font-size: 12px; 
            text-align: center;
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
        
        <h2 style="margin-bottom: 10px;">Fee Transactions Report</h2>
        <p class="meta">Period: ${periodLabel} | Generated: ${format(now, 'dd MMM yyyy, hh:mm a')}</p>
        
        <table>
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Member Name</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
            ${paidInPeriod.map(due => `
              <tr>
                <td>${due.receiptNumber || '-'}</td>
                <td>${due.memberName}</td>
                <td>${due.periodStart && due.periodEnd 
                  ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM yyyy')}`
                  : 'N/A'}</td>
                <td>Rs. ${Number(due.amount).toLocaleString('en-IN')}</td>
                <td>${due.paidDate ? format(parseISO(due.paidDate), 'dd MMM yyyy') : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p class="total">Total: Rs. ${totalAmount.toLocaleString('en-IN')} (${paidInPeriod.length} transactions)</p>
        
        <p class="footer">This is a computer-generated report.</p>
        
        <script>
          window.onload = function() { 
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    toast.success(`${periodLabel} report opened. Use browser's "Save as PDF" in print dialog.`);
    setShowExportDialog(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <AdminLayout 
      title="Fee Management" 
      searchPlaceholder="Search member..."
      onSearch={setSearchQuery}
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-warning" />
            <span className="text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pending.length}</p>
          <p className="text-sm text-warning">₹{stats.totalPending.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-muted-foreground">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.overdue.length}</p>
          <p className="text-sm text-destructive">₹{stats.totalOverdue.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-muted-foreground">Paid</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.paid.length}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowExportDialog(true)} 
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" />
            Add Fee
          </Button>
        </div>
      </div>

      {/* Dues List */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Member</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Period</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No fees found
                  </td>
                </tr>
              ) : (
                filteredDues.map((due) => (
                  <tr key={due.id} className="border-b border-border hover:bg-secondary/30">
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
                    <td className="p-4 font-semibold">₹{due.amount}</td>
                    <td className="p-4">{due.dueDate ? format(parseISO(due.dueDate), 'dd MMM yyyy') : 'Not set'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(due.status)}
                        <span className={`capitalize ${
                          due.status === 'paid' ? 'text-success' :
                          due.status === 'overdue' ? 'text-destructive' :
                          'text-warning'
                        }`}>
                          {due.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {due.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkPaid(due.id, due.memberId, due.memberName, due.amount, due.periodEnd)}
                          className="gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Paid
                        </Button>
                      )}
                      {due.status === 'paid' && due.receiptNumber && (
                        <span className="text-sm text-muted-foreground">
                          {due.receiptNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Due Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Fee</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select 
                value={formData.memberId} 
                onValueChange={(value) => {
                  const member = members.find(m => m.id === value);
                  setFormData({ 
                    ...formData, 
                    memberId: value,
                    amount: member?.monthlyFee || 500
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period Start Date</Label>
              <Input
                type="date"
                value={formData.periodStart}
                onChange={(e) => {
                  const start = e.target.value;
                  const endDate = new Date(start);
                  endDate.setDate(endDate.getDate() + 30);
                  setFormData({ 
                    ...formData, 
                    periodStart: start,
                    periodEnd: format(endDate, 'yyyy-MM-dd')
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Period End Date (30 days)</Label>
              <Input
                type="date"
                value={formData.periodEnd}
                disabled
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDue} className="btn-primary">
              Add Fee
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
              {getFilteredTransactions(exportPeriod).length} paid transaction{getFilteredTransactions(exportPeriod).length !== 1 ? 's' : ''} in this period
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
    </AdminLayout>
  );
};

export default DuesPage;