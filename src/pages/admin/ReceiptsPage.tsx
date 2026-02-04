import { useState, useMemo } from 'react';
import { 
  FileText,
  Printer
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDues, useMembers } from '@/hooks/useFirebaseData';
import { format, parseISO } from 'date-fns';

const ReceiptsPage = () => {
  const { dues } = useDues();
  const { members } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const safeParseISO = (value?: string) => {
    if (!value) return null;
    try {
      return parseISO(value);
    } catch {
      return null;
    }
  };

  const paidDues = useMemo(() => {
    return dues
      .filter(due => due.status === 'paid' && !!due.receiptNumber)
      .sort((a, b) => new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime());
  }, [dues]);

  const filteredReceipts = useMemo(() => {
    let filtered = paidDues;

    if (selectedPeriod !== 'all') {
      const periodKey = selectedPeriod.slice(0, 7);
      filtered = filtered.filter(due => (due.periodStart || '').startsWith(periodKey));
    }

    if (searchQuery) {
      filtered = filtered.filter(due =>
        due.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        due.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [paidDues, selectedPeriod, searchQuery]);

  const availablePeriods = useMemo(() => {
    const periods = new Set(
      paidDues
        .map(due => due.periodStart?.slice(0, 7))
        .filter((p): p is string => !!p)
    );
    return Array.from(periods).sort().reverse();
  }, [paidDues]);

  const printReceipt = (due: typeof paidDues[0]) => {
    const member = members.find(m => m.id === due.memberId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Safely get amount as number
    const amount = Number(due.amount) || 0;
    
    // Safely format dates
    const periodStart = safeParseISO(due.periodStart);
    const periodEnd = safeParseISO(due.periodEnd);
    const periodText = periodStart && periodEnd 
      ? `${format(periodStart, 'dd MMM')} - ${format(periodEnd, 'dd MMM yyyy')}`
      : 'N/A';
    
    const paidDateText = due.paidDate 
      ? format(new Date(due.paidDate), 'dd MMM yyyy')
      : 'N/A';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt - ${due.receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 600px; 
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
              margin: 0;
              font-size: 28px;
            }
            .header p { 
              color: #666; 
              margin: 5px 0;
              font-size: 14px;
            }
            .receipt-number {
              background: #fff7ed;
              padding: 12px 24px;
              border-radius: 8px;
              display: inline-block;
              margin-bottom: 30px;
              border: 2px solid #f97316;
            }
            .receipt-number strong {
              color: #f97316;
              font-size: 18px;
            }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 30px;
            }
            .detail-item {
              padding: 12px;
              background: #f9f9f9;
              border-radius: 8px;
            }
            .detail-item label {
              color: #666;
              font-size: 12px;
              display: block;
              margin-bottom: 4px;
            }
            .detail-item span {
              font-weight: bold;
              font-size: 16px;
              color: #333;
            }
            .amount {
              text-align: center;
              padding: 25px;
              background: #f97316;
              color: white;
              border-radius: 12px;
              margin-bottom: 30px;
            }
            .amount label {
              font-size: 14px;
              display: block;
              margin-bottom: 8px;
              opacity: 0.9;
            }
            .amount .value {
              font-size: 36px;
              font-weight: bold;
              display: block;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 40px;
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

          <div style="text-align: center;">
            <div class="receipt-number">
              <strong>Receipt #${due.receiptNumber}</strong>
            </div>
          </div>

          <div class="details">
            <div class="detail-item">
              <label>Member Name</label>
              <span>${due.memberName}</span>
            </div>
            <div class="detail-item">
              <label>Email</label>
              <span>${member?.email || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Fee Period</label>
              <span>${periodText}</span>
            </div>
            <div class="detail-item">
              <label>Payment Date</label>
              <span>${paidDateText}</span>
            </div>
          </div>

          <div class="amount">
            <label>Amount Paid</label>
            <span class="value">Rs. ${amount.toLocaleString('en-IN')}</span>
          </div>

          <div class="footer">
            <p>Thank you for being a valued member!</p>
            <p>This is a computer-generated receipt.</p>
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
  };

  return (
    <AdminLayout 
      title="Receipts" 
      searchPlaceholder="Search receipts..."
      onSearch={setSearchQuery}
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {availablePeriods.map((period) => (
                <SelectItem key={period} value={period}>
                  {format(new Date(period + '-01'), 'MMMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-muted-foreground">
            {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Receipts Grid */}
      {filteredReceipts.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No receipts found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.map((due) => (
            <div key={due.id} className="card-elevated p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt</p>
                  <p className="font-mono font-semibold text-primary">{due.receiptNumber}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-success" />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member</span>
                  <span className="font-medium">{due.memberName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Period</span>
                  <span className="text-sm">
                    {safeParseISO(due.periodStart) && safeParseISO(due.periodEnd)
                      ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM')}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">₹{due.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Paid On</span>
                  <span className="text-sm">{due.paidDate ? format(new Date(due.paidDate), 'dd MMM yyyy') : 'N/A'}</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => printReceipt(due)}
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default ReceiptsPage;