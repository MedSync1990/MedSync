import React from 'react';
import { PageHeader } from '../../components/PageHeader';

export const ManageTreatmentCatalogue: React.FC = () => {
  return (
    <div className="py-6 max-w-6xl mx-auto">
      <PageHeader
        title="Treatment Catalogue"
        subtitle="Manage available treatments, standard pricing, and insurance eligibility."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Treatment Catalogue' }]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Treatment catalogue items and pricing.</p>
      </div>
    </div>
  );
};

export default ManageTreatmentCatalogue;
