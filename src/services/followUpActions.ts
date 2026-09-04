import { db } from '../db';
import { ResidentTask } from '../types';

/** Shared Resident Follow-up mutation surface — the one place Dashboard,
 *  Huddle, and Resident Profile all route follow-up actions through, so
 *  overdue/progress/carry-forward/Needs Review rules stay defined exactly
 *  once (in `db/index.ts`) no matter which screen triggered the change.
 *  Each function is a thin wrapper; no business logic lives here. */
export const followUpActions = {
  markDone: (taskId: string): ResidentTask => db.setResidentTaskFollowUpStatus(taskId, 'done'),
  carryForward: (taskId: string): ResidentTask => db.setResidentTaskFollowUpStatus(taskId, 'carry_forward'),
  needsReview: (taskId: string): ResidentTask => db.setResidentTaskFollowUpStatus(taskId, 'needs_review'),
  noLongerNeeded: (taskId: string): ResidentTask => db.setResidentTaskFollowUpStatus(taskId, 'no_longer_needed'),
  extendTracking: (taskId: string, newEndDate: string): ResidentTask => db.extendResidentTaskTracking(taskId, newEndDate),
  recordOccurrence: (taskId: string): ResidentTask => db.recordResidentTaskOccurrence(taskId),
};
