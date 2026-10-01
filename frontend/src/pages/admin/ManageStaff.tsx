import React from 'react';
import { PageHeader } from '../../components/PageHeader';

export const ManageStaff: React.FC = () => {
  return (
    <div className="py-6 max-w-6xl mx-auto">
      <PageHeader
        title="Manage Staff"
        subtitle="Manage clinic staff profiles and roles."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Manage Staff' }]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Staff list and role assignment.</p>
      </div>
    </div>
  );
};

export default ManageStaff;
