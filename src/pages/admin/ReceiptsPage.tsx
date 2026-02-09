import { useState, useMemo } from 'react';
import { 
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Download
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDues, useMembers } from '@/hooks/useFirebaseData';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';

const ReceiptsPage = () => {
  const { dues } = useDues();
  const { members } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [verifyReceiptId, setVerifyReceiptId] = useState('');
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    found: boolean;
    receipt?: typeof dues[0];
  } | null>(null);

  const safeParseISO = (value?: string) => {
    if (!value) return null;
    try {
      return parseISO(value);
    } catch {
      return null;
    }
  };

  // Helper function to convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    if (num < 1000) return convertLessThanThousand(num);
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return convertLessThanThousand(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      return convertLessThanThousand(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    const crores = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return convertLessThanThousand(crores) + ' Crore' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
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

  const verifyReceipt = () => {
    if (!verifyReceiptId.trim()) {
      setVerificationResult(null);
      return;
    }
    
    const receipt = paidDues.find(
      due => due.receiptNumber?.toLowerCase() === verifyReceiptId.trim().toLowerCase()
    );
    
    setVerificationResult({
      found: !!receipt,
      receipt: receipt
    });
  };

  const downloadReceiptPDF = (due: typeof paidDues[0]) => {
    const member = members.find(m => m.id === due.memberId);
    const amount = Number(due.amount) || 0;
    
    const periodStart = safeParseISO(due.periodStart);
    const periodEnd = safeParseISO(due.periodEnd);
    const periodText = periodStart && periodEnd 
      ? `${format(periodStart, 'dd MMM')} - ${format(periodEnd, 'dd MMM yyyy')}`
      : 'N/A';
    
    const paidDateText = due.paidDate 
      ? format(new Date(due.paidDate), 'dd MMM yyyy')
      : 'N/A';

    // Create PDF using jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 25;

    // Header - Library Name (Hindi)
    pdf.setFontSize(22);
    pdf.setTextColor(249, 115, 22);
    pdf.text('Shri Hanumant Library', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Subtitle
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    pdf.text('74XH+3HW, Ramuvapur, Mahmudabad, Uttar Pradesh 261203', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    pdf.text('Phone: +91 79913 04874 | Email: info@shrihanumantlibrary.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Orange line
    pdf.setDrawColor(249, 115, 22);
    pdf.setLineWidth(1);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Receipt Title
    pdf.setFontSize(18);
    pdf.setTextColor(51, 51, 51);
    pdf.text('PAYMENT RECEIPT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Receipt Number Box
    pdf.setFillColor(255, 247, 237);
    pdf.setDrawColor(249, 115, 22);
    pdf.setLineWidth(0.5);
    const receiptBoxWidth = 80;
    const receiptBoxX = (pageWidth - receiptBoxWidth) / 2;
    pdf.roundedRect(receiptBoxX, yPos - 6, receiptBoxWidth, 14, 3, 3, 'FD');
    pdf.setFontSize(14);
    pdf.setTextColor(234, 88, 12);
    pdf.text(due.receiptNumber || 'N/A', pageWidth / 2, yPos + 3, { align: 'center' });
    yPos += 20;

    // Member Details Section
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(229, 229, 229);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'FD');
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(136, 136, 136);
    pdf.text('MEMBER DETAILS', margin + 8, yPos);
    yPos += 8;

    pdf.setFontSize(11);
    pdf.setTextColor(26, 26, 26);
    const col1X = margin + 8;
    const col2X = pageWidth / 2 + 5;

    pdf.setTextColor(136, 136, 136);
    pdf.setFontSize(9);
    pdf.text('Member Name', col1X, yPos);
    pdf.text('Email Address', col2X, yPos);
    yPos += 5;
    pdf.setTextColor(26, 26, 26);
    pdf.setFontSize(11);
    pdf.text(due.memberName, col1X, yPos);
    pdf.text(member?.email || 'N/A', col2X, yPos);
    yPos += 10;

    pdf.setTextColor(136, 136, 136);
    pdf.setFontSize(9);
    pdf.text('Phone Number', col1X, yPos);
    pdf.text('Member ID', col2X, yPos);
    yPos += 5;
    pdf.setTextColor(26, 26, 26);
    pdf.setFontSize(11);
    pdf.text(member?.phone || 'N/A', col1X, yPos);
    pdf.text(member?.id?.slice(0, 8).toUpperCase() || 'N/A', col2X, yPos);
    yPos += 15;

    // Payment Details Section
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(229, 229, 229);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'FD');
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(136, 136, 136);
    pdf.text('PAYMENT DETAILS', margin + 8, yPos);
    yPos += 8;

    pdf.setTextColor(136, 136, 136);
    pdf.setFontSize(9);
    pdf.text('Fee Period', col1X, yPos);
    pdf.text('Payment Date', col2X, yPos);
    yPos += 5;
    pdf.setTextColor(26, 26, 26);
    pdf.setFontSize(11);
    pdf.text(periodText, col1X, yPos);
    pdf.text(paidDateText, col2X, yPos);
    yPos += 10;

    pdf.setTextColor(136, 136, 136);
    pdf.setFontSize(9);
    pdf.text('Payment Method', col1X, yPos);
    pdf.text('Status', col2X, yPos);
    yPos += 5;
    pdf.setTextColor(26, 26, 26);
    pdf.setFontSize(11);
    pdf.text('Cash / Online', col1X, yPos);
    pdf.setTextColor(22, 163, 74);
    pdf.text('Paid', col2X, yPos);
    yPos += 18;

    // Amount Section - Orange gradient box
    pdf.setFillColor(249, 115, 22);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 4, 4, 'F');
    yPos += 10;

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.text('TOTAL AMOUNT PAID', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    pdf.setFontSize(28);
    pdf.text(`Rs. ${amount.toLocaleString('en-IN')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    pdf.setFontSize(10);
    pdf.text(`Rupees ${numberToWords(amount)} Only`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 25;

    // Signature Section
    pdf.setTextColor(51, 51, 51);
    pdf.setDrawColor(51, 51, 51);
    pdf.setLineWidth(0.3);
    
    const sigY = yPos + 20;
    pdf.line(margin + 10, sigY, margin + 70, sigY);
    pdf.line(pageWidth - margin - 70, sigY, pageWidth - margin - 10, sigY);
    
    pdf.setFontSize(9);
    pdf.setTextColor(102, 102, 102);
    pdf.text('Member Signature', margin + 40, sigY + 6, { align: 'center' });
    pdf.text('Authorized Signature', pageWidth - margin - 40, sigY + 6, { align: 'center' });
    yPos = sigY + 20;

    // Footer
    pdf.setDrawColor(229, 229, 229);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    pdf.text('Thank you for being a valued member of Shri Hanumant Library!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    pdf.setFontSize(8);
    pdf.text('This is a computer-generated receipt and does not require a physical signature.', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    pdf.text('For any queries, please contact us at +91 79913 04874', pageWidth / 2, yPos, { align: 'center' });

    // No watermark - removed per user request

    // Save PDF immediately
    pdf.save(`Receipt-${due.receiptNumber}.pdf`);
  };

  return (
    <AdminLayout 
      title="Receipts" 
      searchPlaceholder="Search receipts..."
      onSearch={setSearchQuery}
    >
      {/* Filters and Verify Button */}
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

        {/* Verify Receipt Button */}
        <Dialog open={verifyDialogOpen} onOpenChange={(open) => {
          setVerifyDialogOpen(open);
          if (!open) {
            setVerifyReceiptId('');
            setVerificationResult(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Search className="w-4 h-4" />
              Verify Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Verify Receipt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Receipt ID (e.g., REC-001)"
                  value={verifyReceiptId}
                  onChange={(e) => setVerifyReceiptId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyReceipt()}
                />
                <Button onClick={verifyReceipt} className="gap-2">
                  <Search className="w-4 h-4" />
                  Verify
                </Button>
              </div>

              {verificationResult && (
                <div className={`p-4 rounded-lg ${verificationResult.found ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {verificationResult.found ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-success" />
                        <span className="font-semibold text-success">Receipt Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-destructive" />
                        <span className="font-semibold text-destructive">Receipt Not Found</span>
                      </>
                    )}
                  </div>

                  {verificationResult.found && verificationResult.receipt && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receipt #</span>
                        <span className="font-mono font-semibold">{verificationResult.receipt.receiptNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Member</span>
                        <span className="font-medium">{verificationResult.receipt.memberName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee Period</span>
                        <span className="font-medium">
                          {safeParseISO(verificationResult.receipt.periodStart) && safeParseISO(verificationResult.receipt.periodEnd)
                            ? `${format(parseISO(verificationResult.receipt.periodStart), 'dd MMM yyyy')} - ${format(parseISO(verificationResult.receipt.periodEnd), 'dd MMM yyyy')}`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold">₹{verificationResult.receipt.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid On</span>
                        <span>{verificationResult.receipt.paidDate ? format(new Date(verificationResult.receipt.paidDate), 'dd MMM yyyy') : 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {!verificationResult.found && (
                    <p className="text-sm text-muted-foreground">
                      No receipt found with ID "{verifyReceiptId}". Please check the receipt number and try again.
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
                onClick={() => downloadReceiptPDF(due)}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default ReceiptsPage;
