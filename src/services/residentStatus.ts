import { ResidentStatus } from '../types';

export const RESIDENT_STATUS_LABELS: Record<ResidentStatus, string> = {
  active: 'Active',
  in_hospital: 'In Hospital',
  out_on_pass: 'Out on Pass',
  on_hold: 'On Hold',
  inactive: 'Inactive',
  discharged: 'Discharged',
  deceased: 'Deceased',
};

export function getResidentStatusLabel(status: ResidentStatus): string {
  return RESIDENT_STATUS_LABELS[status] || status;
}

export function isResidentCarePaused(status: ResidentStatus): boolean {
  return status !== 'active';
}

export function isResidentStatusException(status: ResidentStatus): boolean {
  return status === 'in_hospital' || status === 'out_on_pass' || status === 'on_hold';
}
