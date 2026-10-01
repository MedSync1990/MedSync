import React from 'react';
import { DoctorTreatmentCatalogue } from '../doctor/DoctorTreatmentCatalogue';

export const ManageTreatmentCatalogue: React.FC = () => {
  return <DoctorTreatmentCatalogue canEdit={true} />;
};

export default ManageTreatmentCatalogue;

