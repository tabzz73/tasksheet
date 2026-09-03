import { AppDatabaseState } from '../types';

/** Pure, derived "Appears in" labels for the Quick Add / Add Attention forms —
 *  computed from fields the form already collects, never a separate set of
 *  routing checkboxes. Mirrors the exact rules the real services apply
 *  (generator, dashboard, binderBuilder) so the preview never drifts from
 *  actual behavior. */

function shiftLabel(state: AppDatabaseState, shiftId?: string): string | undefined {
  if (!shiftId) return undefined;
  const shift = state.shifts.find(s => s.id === shiftId);
  return shift ? `${shift.shortCode || shift.name} Shift Workspace & TaskSheet` : undefined;
}

function roleLabel(state: AppDatabaseState, roleId?: string): string | undefined {
  if (!roleId) return undefined;
  const role = state.roles.find(r => r.id === roleId);
  return role ? `${role.name} TaskSheets (all shifts)` : undefined;
}

export interface FyiRoutingDraft {
  residentId?: string;
  roleId?: string;
  shiftId?: string;
  showOnDashboard?: boolean;
  showInHuddle?: boolean;
}

/** FYI: visible in the FYI Binder (subject to its active window); on the
 *  Dashboard and/or the future Huddle View only when explicitly flagged;
 *  scoped to a shift/role/resident the same way print and the Shift
 *  Workspace already filter it. */
export function describeFyiRouting(state: AppDatabaseState, draft: FyiRoutingDraft): string[] {
  const labels = ['FYI Binder'];
  if (draft.showOnDashboard !== false) labels.unshift('Dashboard');
  if (draft.showInHuddle) labels.push('Huddle');
  const scoped = shiftLabel(state, draft.shiftId) || roleLabel(state, draft.roleId);
  if (scoped) {
    labels.push(scoped);
  } else if (draft.residentId) {
    labels.push("This resident's TaskSheets (all shifts)");
  } else {
    labels.push('Shared TaskSheets (if facility print setting enabled)');
  }
  return labels;
}

export interface AttentionRoutingDraft {
  roleId?: string;
  shiftId?: string;
  includeInFyiBinder?: boolean;
  showOnDashboard?: boolean;
  showInHuddle?: boolean;
}

/** Resident Attention: on the Dashboard while active unless explicitly
 *  turned off; reaches a printed TaskSheet / Shift Workspace only when
 *  explicitly scoped to a shift or role — an unscoped item stays
 *  Dashboard-only by design, so it doesn't get blasted onto every shift's
 *  paperwork. */
export function describeAttentionRouting(state: AppDatabaseState, draft: AttentionRoutingDraft): string[] {
  const labels: string[] = [];
  if (draft.showOnDashboard !== false) labels.push('Dashboard');
  if (draft.showInHuddle) labels.push('Huddle');
  const scoped = shiftLabel(state, draft.shiftId) || roleLabel(state, draft.roleId);
  if (scoped) labels.push(scoped);
  if (draft.includeInFyiBinder) labels.push('FYI Binder');
  return labels;
}

export interface TaskRoutingDraft {
  roleId?: string;
  shiftId?: string;
  showOnDashboard?: boolean;
  showInHuddle?: boolean;
}

/** Resident Task / Unit Task: shift/role assignment is fully automatic —
 *  this just makes that existing routing visible. Dashboard/Huddle
 *  inclusion is opt-in (unlike FYI/Resident Attention), since most tasks
 *  are routine and shouldn't compete for attention with the ones flagged
 *  as genuine follow-up. */
export function describeTaskRouting(state: AppDatabaseState, draft: TaskRoutingDraft): string[] {
  const labels: string[] = [];
  if (draft.showOnDashboard) labels.push('Dashboard');
  if (draft.showInHuddle) labels.push('Huddle');
  const scoped = shiftLabel(state, draft.shiftId) || roleLabel(state, draft.roleId);
  labels.push(scoped || 'Select a shift or role to see where this will appear');
  return labels;
}
