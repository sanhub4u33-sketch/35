import { useState } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Phone, 
  Mail,
  Calendar
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import MemberDetailModal from '@/components/admin/MemberDetailModal';

const MembersPage = () => {
  const { members, loading, addMember, deleteMember } = useMembers();
  const { dues, createInitialFee, getMemberDues, markAsPaid } = useDues();
  const { getMemberAttendance } = useAttendance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    seatNumber: '',
    shift: 'morning',
    monthlyFee: 500,
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
    });
  };

  const handleAddMember = async () => {
    try {
      // Store current admin user before creating member
      const currentAdmin = auth.currentUser;
      const adminEmail = currentAdmin?.email;

      // Create Firebase Auth user for the new member
      await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // Sign out the newly created member (Firebase auto-signs in new users)
      await auth.signOut();

      const joinDate = new Date().toISOString().split('T')[0];

      // Add member to database
      const memberId = await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        seatNumber: formData.seatNumber,
        shift: formData.shift,
        monthlyFee: formData.monthlyFee,
        status: 'active',
        joinDate,
        password: formData.password, // Store for admin to view/edit
      });

      // Create initial fee for the member
      if (memberId) {
        await createInitialFee(
          memberId,
          formData.name,
          formData.monthlyFee,
          joinDate
        );
      }

      toast.success(`Member added! Login credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}`);
      toast.info('You have been signed out. Please log in again as admin.');
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
        <DialogContent className="max-w-md">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seat Number</Label>
                <Input
                  placeholder="e.g., A-12"
                  value={formData.seatNumber}
                  onChange={(e) => setFormData({ ...formData, seatNumber: e.target.value })}
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
        onMarkAsPaid={markAsPaid}
      />
    </AdminLayout>
  );
};

export default MembersPage;