import AdminLayout from '@/components/AdminLayout';
import AdvancedReports from '@/components/admin/AdvancedReports';
import AdminFeedbackList from '@/components/admin/AdminFeedbackList';

const ReportsPage = () => {
  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-8">
        <AdvancedReports />
        <AdminFeedbackList />
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
