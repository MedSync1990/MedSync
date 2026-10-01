import React from 'react';
import { PageHeader } from '../../components/PageHeader';

export const BranchDetails: React.FC = () => {
  return (
    <div className="py-6 max-w-4xl mx-auto">
      <PageHeader
        title="Branch Details"
        subtitle="Manage branch contact details, operational hours, and facility information."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Branch Details' }]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Branch configuration and operational overview.</p>
      </div>
    </div>
  );
};

export default BranchDetails;
