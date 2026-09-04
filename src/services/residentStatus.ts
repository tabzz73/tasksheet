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

/** True for residents still on the unit's roster in some operational sense
 *  (active, or temporarily away on hospital/pass/hold) — false once they've
 *  actually left (discharged, deceased, inactive). Dashboard awareness cards
 *  (Resident Attention, Resident Follow-up, resident-scoped FYIs) use this
 *  to stop surfacing stale records for residents who are genuinely gone,
 *  while still showing them for residents who are just temporarily away. */
export function isResidentCurrent(status: ResidentStatus): boolean {
  return status !== 'discharged' && status !== 'deceased' && status !== 'inactive';
}
