import { useState } from 'react';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ref, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Feedback } from '@/types/library';

interface FeedbackFormProps {
  memberId: string;
  memberName: string;
}

const FeedbackForm = ({ memberId, memberName }: FeedbackFormProps) => {
  const [type, setType] = useState<Feedback['type']>('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const feedbackData: Omit<Feedback, 'id'> = {
        memberId,
        memberName,
        type,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await push(ref(database, 'feedback'), feedbackData);
      
      setSubmitted(true);
      toast.success('Feedback submitted successfully!');
      
      // Reset form after delay
      setTimeout(() => {
        setSubject('');
        setMessage('');
        setType('suggestion');
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card-elevated p-6 text-center">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          Thank You!
        </h3>
        <p className="text-muted-foreground">
          Your feedback has been submitted. We appreciate your input!
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg font-semibold text-foreground">
          Submit Feedback
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Feedback Type</Label>
          <Select value={type} onValueChange={(val) => setType(val as Feedback['type'])}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suggestion">💡 Suggestion</SelectItem>
              <SelectItem value="appreciation">🙏 Appreciation</SelectItem>
              <SelectItem value="complaint">⚠️ Complaint</SelectItem>
              <SelectItem value="other">📝 Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            placeholder="Brief subject of your feedback"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            placeholder="Share your thoughts, suggestions, or concerns..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/1000
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full btn-primary gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
};

export default FeedbackForm;
