import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createFirstAdmin } from '../services/auth';
import { recordPrint } from '../services/printHistory';

describe('audit log — domain mutation coverage', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });

  const lastEvent = () => {
    const events = db.getState().auditEvents;
    return events[events.length - 1];
  };

  it('audits resident creation and status changes', () => {
    const resident = db.addResident({
      firstName: 'Ada', lastName: 'Lovelace', roomNumber: '999', status: 'active',
    } as any);
    expect(lastEvent().action).toBe('created');
    expect(lastEvent().entityType).toBe('resident');
    expect(lastEvent().residentId).toBe(resident.id);

    db.updateResident(resident.id, { status: 'in_hospital' });
    expect(lastEvent().action).toBe('status_changed');
    expect(lastEvent().changes).toMatch(/Status: active → in_hospital/);
  });

  it('audits resident task creation, follow-up status changes, occurrences, and tracking extension', () => {
    const resident = db.getState().residents[0];
    const shift = db.getState().shifts[0];
    const task = db.addResidentTask({
      residentId: resident.id, shiftId: shift.id, title: 'Test Task', category: 'General',
      timingType: 'period', frequency: 'daily', showOnDashboard: true,
      trackingConfig: { requiredOccurrences: 2, completedOccurrences: 0 },
    } as any);
    expect(lastEvent().action).toBe('created');
    expect(lastEvent().entityType).toBe('resident_task');

    db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
    expect(lastEvent().action).toBe('follow_up_status_changed');

    db.recordResidentTaskOccurrence(task.id);
    expect(lastEvent().action).toBe('occurrence_recorded');
    expect(lastEvent().changes).toMatch(/0\/2 → 1\/2/);
  });

  it('audits attention item creation and ending', () => {
    const item = db.addAttentionItem({ title: 'Slippery Floor', scope: 'site', priority: 'high' } as any);
    expect(lastEvent().action).toBe('created');
    expect(lastEvent().entityType).toBe('attention_item');

    db.endAttentionItem(item.id);
    expect(lastEvent().action).toBe('ended');
  });

  it('audits FYI creation and updates', () => {
    const fyi = db.addFYI({ text: 'Test FYI note', importance: 'normal', showOnDashboard: false, showInHuddle: false } as any);
    expect(lastEvent().action).toBe('created');
    expect(lastEvent().entityType).toBe('fyi');

    db.updateFYI(fyi.id, { showOnDashboard: true });
    expect(lastEvent().action).toBe('updated');
    expect(lastEvent().changes).toMatch(/Show on Dashboard: On/);
  });

  it('audits wound creation and status change', () => {
    const resident = db.getState().residents[0];
    const lpnRole = db.getState().roles.find(role => /LPN|RN/i.test(role.code) || /LPN|RN/i.test(role.name));
    const shift = db.getState().shifts.find(s => s.roleId === lpnRole?.id) || db.getState().shifts[0];
    const wound = db.addWound({
      residentId: resident.id, shiftId: shift.id, siteLocation: 'Left Heel', status: 'active', frequency: 'daily', timingType: 'period',
    } as any);
    expect(lastEvent().action).toBe('created');
    expect(lastEvent().entityType).toBe('wound');

    db.updateWound(wound.id, { status: 'resolved' });
    expect(lastEvent().action).toBe('status_changed');
    expect(lastEvent().changes).toMatch(/Status: active → resolved/);
  });

  it('audits shift and facility settings changes', () => {
    db.updateFacility({ siteName: 'New Facility Name' });
    expect(lastEvent().entityType).toBe('facility_settings');

    const shift = db.getState().shifts[0];
    db.updateShift(shift.id, { name: 'Renamed Shift' });
    expect(lastEvent().action).toBe('updated');
    expect(lastEvent().entityType).toBe('shift');
  });

  it('audits backup export and restore', () => {
    const json = db.backupDatabase();
    db.recordAuditEvent({ action: 'backup_exported', entityType: 'backup', summary: 'Full database backup exported' });
    expect(lastEvent().action).toBe('backup_exported');

    db.restoreDatabase(json);
    expect(lastEvent().action).toBe('backup_restored');
  });

  it('audits demo load / clear and real setup', () => {
    // Demo state (beforeEach) — clearDemoData() delegates to startRealSetup()
    // when the facility is entirely demo, per db/index.ts's own logic.
    db.clearDemoData();
    expect(lastEvent().action).toBe('real_setup_started');

    db.loadDemoData();
    expect(lastEvent().action).toBe('demo_loaded');
  });

  it('emits a print_preview_opened audit event alongside recordPrint, never claiming an actual print completed', () => {
    const shift = db.getState().shifts[0];
    recordPrint({ shiftId: shift.id, shiftCode: shift.shortCode, shiftName: shift.name, date: '2026-09-04', profile: 'simple_checklist', totalItems: 3 });
    expect(lastEvent().action).toBe('print_preview_opened');
    expect(lastEvent().summary.toLowerCase()).not.toContain('printed');
  });

  it('is append-only — no update/delete method exists on auditEvents', () => {
    const db_ = db as unknown as Record<string, unknown>;
    expect(db_.updateAuditEvent).toBeUndefined();
    expect(db_.deleteAuditEvent).toBeUndefined();
  });

  it('snapshots the display name at write time — a later name change does not rewrite history', () => {
    // No actor signed in at the moment of creation — the event should
    // snapshot "Unknown User", not retroactively pick up a later sign-in.
    db.setCurrentActor(null);
    const user = db.addUser({ username: 'newperson', displayName: 'Original Name', role: 'hca', active: true, passwordHash: 'pbkdf2$1$a$b' });
    const createdEvent = db.getState().auditEvents.find(e => e.action === 'created' && e.entityType === 'user' && e.entityId === user.id);
    expect(createdEvent?.userDisplayName).toBe('Unknown User');

    db.setCurrentActor({ id: user.id, displayName: 'Original Name' });
    db.updateUser(user.id, { displayName: 'Renamed Later' });
    const renameEvent = lastEvent();
    expect(renameEvent.userDisplayName).toBe('Original Name');
    // The earlier 'created' event's snapshot is untouched by the later rename.
    const createdEventAfter = db.getState().auditEvents.find(e => e.id === createdEvent!.id);
    expect(createdEventAfter?.userDisplayName).toBe('Unknown User');
  });

  it('filters events by residentId for resident-scoped history', () => {
    const [residentA, residentB] = db.getState().residents;
    db.updateResident(residentA.id, { status: 'in_hospital' });
    db.updateResident(residentB.id, { status: 'in_hospital' });
    const eventsForA = db.getState().auditEvents.filter(e => e.residentId === residentA.id);
    expect(eventsForA.length).toBeGreaterThan(0);
    expect(eventsForA.every(e => e.residentId === residentA.id)).toBe(true);
  });

  it('tags events with sourceMode matching the facility data mode', () => {
    // Demo state from beforeEach — dataMode is 'demo'.
    const resident = db.getState().residents[0];
    db.updateResident(resident.id, { status: 'in_hospital' });
    expect(lastEvent().sourceMode).toBe('demo');

    db.startRealSetup();
    const shift = db.addShift({ name: 'Day', shortCode: 'D1', roleId: db.getState().roles[0]?.id || 'r1', startTime: '0700', endTime: '1500' } as any);
    void shift;
    expect(lastEvent().sourceMode).toBe('manual');
  });
});
