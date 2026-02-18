import { useState } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Phone, 
  Mail,
  Calendar,
  Upload,
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
import { useMembers, useDues, useAttendance } from '@/hooks/useFirebaseData';
import { Member } from '@/types/library';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { secondaryAuth } from '@/lib/firebase';
import MemberDetailModal from '@/components/admin/MemberDetailModal';

const MembersPage = () => {
  const { members, loading, addMember, deleteMember } = useMembers();
  const { getMemberDues, recordPayment, markDuePaid, deletePayment } = useDues();
  const { getMemberAttendance } = useAttendance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<string | null>(null);
  const [aadhaarFileName, setAadhaarFileName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    seatNumber: '',
    shift: 'morning',
    monthlyFee: 500,
    joinDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone.includes(searchQuery)
  );

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      seatNumber: '',
      shift: 'morning',
      monthlyFee: 500,
      joinDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setAadhaarFile(null);
    setAadhaarFileName('');
  };

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setAadhaarFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAadhaarFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddMember = async () => {
    try {
      await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      );
      await signOut(secondaryAuth);

      const joinDate = formData.joinDate;

      await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        seatNumber: formData.seatNumber,
        shift: formData.shift,
        monthlyFee: formData.monthlyFee,
        status: 'active',
        joinDate,
        password: formData.password,
        ...(aadhaarFile ? { aadhaarDoc: aadhaarFile } : {}),
      } as any);

      toast.success(`Member added! Login credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}`);
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Failed to add member');
    }
  };

  const handleDeleteMember = async (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove ${member.name}?`)) {
      try {
        await deleteMember(member.id, member.name);
        toast.success('Member removed successfully');
      } catch (error) {
        toast.error('Failed to remove member');
      }
    }
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  return (
    <AdminLayout 
      title="Members" 
      searchPlaceholder="Search members..."
      onSearch={setSearchQuery}
    >
      {/* Add Member Button */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
        </p>
        <Button onClick={() => setShowAddDialog(true)} className="btn-primary gap-2">
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Members Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div 
              key={member.id} 
              className="card-elevated p-5 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleMemberClick(member)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                    {member.profilePic ? (
                      <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      member.status === 'active' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Joined: {format(new Date(member.joinDate), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMemberClick(member);
                  }}
                >
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteMember(member, e)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md w-[95vw] sm:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="text"
                placeholder="Set password for member"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input
                placeholder="Enter address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Seat Number</Label>
              <Input
                placeholder="e.g., A-12"
                value={formData.seatNumber}
                onChange={(e) => setFormData({ ...formData, seatNumber: e.target.value })}
              />
            </div>

            {/* Aadhaar Card Upload */}
            <div className="space-y-2">
              <Label>Aadhaar Card Document</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleAadhaarUpload}
                  className="hidden"
                  id="aadhaar-upload"
                />
                <label htmlFor="aadhaar-upload" className="cursor-pointer">
                  {aadhaarFile ? (
                    <div className="flex items-center gap-2 justify-center text-success">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm">{aadhaarFileName}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Upload Aadhaar Card (Image/PDF, max 5MB)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Join Date</Label>
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Shift</Label>
              <Select 
                value={formData.shift} 
                onValueChange={(value) => setFormData({ ...formData, shift: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="full-day">Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monthly Fee (₹)</Label>
              <Input
                type="number"
                placeholder="500"
                value={formData.monthlyFee}
                onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} className="btn-primary">
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Detail Modal */}
      <MemberDetailModal
        member={selectedMember}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        memberDues={selectedMember ? getMemberDues(selectedMember.id) : []}
        memberAttendance={selectedMember ? getMemberAttendance(selectedMember.id) : []}
        onRecordPayment={recordPayment}
        onMarkDuePaid={markDuePaid}
        onDeleteDue={deletePayment}
      />
    </AdminLayout>
  );
};

export default MembersPage;
