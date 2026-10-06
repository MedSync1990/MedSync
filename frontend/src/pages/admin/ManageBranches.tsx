import React from 'react';
import { PageHeader } from '../../components/PageHeader';

export const ManageBranches: React.FC = () => {
  return (
    <div className="py-6 max-w-6xl mx-auto">
      <PageHeader
        title="Manage Branches"
        subtitle="Configure clinic branches across regions."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Manage Branches' }]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Branches list and configuration.</p>
      </div>
    </div>
  );
};

export default ManageBranches;
