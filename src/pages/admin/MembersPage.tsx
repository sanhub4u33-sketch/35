import { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Phone, 
  Mail,
  Calendar,
  Upload,
  FileText,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowLeft,
  User
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMembers, useDues, useAttendance } from '@/hooks/useFirebaseData';
import { Member } from '@/types/library';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { secondaryAuth } from '@/lib/firebase';
import MemberDetailModal from '@/components/admin/MemberDetailModal';

const LIBRARY_PLANS = [
  { id: '6hr-1m', label: '6 Hours – 1 Month', fee: 650 },
  { id: '6hr-2m', label: '6 Hours – 2 Months', fee: 1200 },
  { id: '6hr-3m', label: '6 Hours – 3 Months', fee: 1650 },
  { id: '12hr-1m', label: '12 Hours – 1 Month', fee: 1200 },
  { id: '12hr-2m', label: '12 Hours – 2 Months', fee: 2200 },
  { id: '12hr-3m', label: '12 Hours – 3 Months', fee: 3000 },
];

const MembersPage = () => {
  const { members, loading, addMember, deleteMember, updateMember } = useMembers();
  const { dues, getMemberDues, recordPayment, markDuePaid, deletePayment } = useDues();
  const { getMemberAttendance } = useAttendance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<string | null>(null);
  const [aadhaarFileName, setAadhaarFileName] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'pending_dues'>('recent');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    seatNumber: '',
    plan: '',
    monthlyFee: 0,
    joinDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery)
    );

    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'pending_dues':
        filtered.sort((a, b) => {
          const aPending = dues.filter(d => d.memberId === a.id && d.status === 'pending').length;
          const bPending = dues.filter(d => d.memberId === b.id && d.status === 'pending').length;
          return bPending - aPending;
        });
        break;
    }

    return filtered;
  }, [members, searchQuery, sortBy, dues]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      seatNumber: '',
      plan: '',
      monthlyFee: 0,
      joinDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setAadhaarFile(null);
    setAadhaarFileName('');
  };

  const handlePlanChange = (planId: string) => {
    const plan = LIBRARY_PLANS.find(p => p.id === planId);
    if (plan) {
      setFormData({ ...formData, plan: planId, monthlyFee: plan.fee });
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const updates: Partial<Member> = { status: newStatus };
      if (newStatus === 'active') {
        updates.reactivatedAt = new Date().toISOString();
      }
      await updateMember(member.id, updates);
      toast.success(`${member.name} marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
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

      await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        seatNumber: formData.seatNumber,
        plan: formData.plan,
        monthlyFee: formData.monthlyFee,
        status: 'active',
        joinDate: formData.joinDate,
        password: formData.password,
        ...(aadhaarFile ? { aadhaarDoc: aadhaarFile } : {}),
      } as any);

      toast.success(`Member added! Login credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}`);
      setShowAddForm(false);
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

  // Full-page add member form
  if (showAddForm) {
    return (
      <AdminLayout title="Add New Member">
        <div className="max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => { setShowAddForm(false); resetForm(); }} 
            className="gap-2 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Members
          </Button>

          <div className="card-elevated p-6 space-y-5">
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
              <Label>Plan</Label>
              <Select 
                value={formData.plan} 
                onValueChange={(value) => handlePlanChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_PLANS.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.label} – ₹{plan.fee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monthly Fee (₹)</Label>
              <Input
                type="number"
                placeholder="Auto-filled from plan"
                value={formData.monthlyFee || ''}
                onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddMember} className="btn-primary flex-1">
                Add Member
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Members" 
      searchPlaceholder="Search members..."
      onSearch={setSearchQuery}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">
          {filteredAndSortedMembers.length} member{filteredAndSortedMembers.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort By */}
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="pending_dues">Pending Dues</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex bg-secondary rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${viewMode === 'card' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={() => setShowAddForm(true)} className="btn-primary h-9 w-9 sm:w-auto sm:px-4 sm:gap-2" size="icon">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Button>
        </div>
      </div>

      {/* Members */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      ) : filteredAndSortedMembers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members found</p>
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedMembers.map((member) => (
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
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{member.name}</h3>
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

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch
                    checked={member.status === 'active'}
                    onCheckedChange={() => handleToggleStatus(member)}
                  />
                  <span className={`text-xs font-medium ${member.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
                    {member.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMemberClick(member);
                    }}
                  >
                    View
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
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card-elevated divide-y divide-border">
          {filteredAndSortedMembers.map((member) => (
            <div 
              key={member.id} 
              className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => handleMemberClick(member)}
            >
              <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden flex-shrink-0">
                {member.profilePic ? (
                  <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground tracking-tight truncate">{member.name}</h3>
                <span className={`text-xs ${member.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
                  {member.status}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={member.status === 'active'}
                  onCheckedChange={() => handleToggleStatus(member)}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  onClick={(e) => handleDeleteMember(member, e)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
        onUpdateMember={updateMember}
      />
    </AdminLayout>
  );
};

export default MembersPage;
