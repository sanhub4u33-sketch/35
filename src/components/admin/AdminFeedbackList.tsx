import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, AlertCircle, Send, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Feedback } from '@/types/library';
import { format, parseISO } from 'date-fns';

const AdminFeedbackList = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Feedback['status']>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    const feedbackRef = ref(database, 'feedback');
    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, f]: [string, any]) => ({ id, ...f }));
        // Sort by newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFeedbackList(list);
      } else {
        setFeedbackList([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredFeedback = feedbackList.filter((f) => 
    filter === 'all' || f.status === filter
  );

  const getStatusBadge = (status: Feedback['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Reviewed</Badge>;
      case 'resolved':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="w-3 h-3" /> Resolved</Badge>;
    }
  };

  const getTypeBadge = (type: Feedback['type']) => {
    switch (type) {
      case 'suggestion':
        return <Badge variant="outline">💡 Suggestion</Badge>;
      case 'appreciation':
        return <Badge variant="outline">🙏 Appreciation</Badge>;
      case 'complaint':
        return <Badge variant="destructive">⚠️ Complaint</Badge>;
      case 'other':
        return <Badge variant="secondary">📝 Other</Badge>;
    }
  };

  const handleRespond = async () => {
    if (!selectedFeedback) return;
    
    setResponding(true);
    try {
      await update(ref(database, `feedback/${selectedFeedback.id}`), {
        adminResponse: adminResponse.trim(),
        status: 'resolved',
        updatedAt: new Date().toISOString(),
      });
      
      toast.success('Response sent and feedback resolved');
      setSelectedFeedback(null);
      setAdminResponse('');
    } catch (error) {
      console.error('Error responding to feedback:', error);
      toast.error('Failed to send response');
    } finally {
      setResponding(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: Feedback['status']) => {
    try {
      await update(ref(database, `feedback/${feedbackId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/3" />
          <div className="h-20 bg-secondary rounded" />
          <div className="h-20 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-display text-xl font-semibold text-foreground">
            Member Feedback
          </h3>
          <Badge variant="secondary">{feedbackList.length}</Badge>
        </div>

        <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
          <SelectTrigger className="w-32">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredFeedback.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No feedback found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((feedback) => (
            <div
              key={feedback.id}
              className={`p-4 rounded-xl border transition-colors ${
                selectedFeedback?.id === feedback.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-secondary/30 hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-foreground">{feedback.memberName}</p>
                  <p className="text-sm text-muted-foreground">
                    {safeFormatDate(feedback.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(feedback.type)}
                  {getStatusBadge(feedback.status)}
                </div>
              </div>

              <h4 className="font-medium text-foreground mb-2">{feedback.subject}</h4>
              <p className="text-muted-foreground text-sm mb-4">{feedback.message}</p>

              {feedback.adminResponse && (
                <div className="p-3 bg-success/10 rounded-lg mb-4">
                  <p className="text-xs text-success font-medium mb-1">Admin Response:</p>
                  <p className="text-sm text-foreground">{feedback.adminResponse}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Select
                  value={feedback.status}
                  onValueChange={(val) => handleStatusChange(feedback.id, val as Feedback['status'])}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                {feedback.status !== 'resolved' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setAdminResponse(feedback.adminResponse || '');
                    }}
                  >
                    Respond
                  </Button>
                )}
              </div>

              {/* Response Form */}
              {selectedFeedback?.id === feedback.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <Textarea
                    placeholder="Type your response to the member..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRespond}
                      disabled={responding || !adminResponse.trim()}
                      className="btn-primary gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {responding ? 'Sending...' : 'Send & Resolve'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFeedback(null);
                        setAdminResponse('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackList;
