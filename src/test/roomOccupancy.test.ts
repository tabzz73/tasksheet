import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { sortRoomNumbers } from '../services/generator';
import { buildCustomReportModel, SYSTEM_REPORT_PRESETS } from '../services/reports';

describe('resident census and room occupancy model', () => {
  beforeEach(() => db.resetToInitialState());

  it('preserves numeric, prefix, suffix, and mixed labels exactly and sorts naturally', () => {
    ['101', '101LF', 'L101', 'West-12', 'L2', 'L10'].forEach(label => db.addRoom(label));
    expect(db.getState().occupancyPositions.map(position => position.displayLabel).sort(sortRoomNumbers))
      .toEqual(['101', '101LF', 'L2', 'L10', 'L101', 'West-12']);
  });

  it('supports multiple occupants in one physical room through unique positions', () => {
    db.addMultiOccupancyRoom('101', ['A', 'B'], 'West');
    const one = db.addResident({ firstName: 'Jane', lastName: 'One', roomNumber: '101A', status: 'active' });
    const two = db.addResident({ firstName: 'John', lastName: 'Two', roomNumber: '101B', status: 'active' });
    expect(one.occupancyPositionId).not.toBe(two.occupancyPositionId);
    expect(db.getState().rooms).toHaveLength(1);
    expect(db.getState().rooms[0].wing).toBe('West');
    expect(db.getState().occupancyPositions.map(position => position.displayLabel)).toEqual(['101A', '101B']);
  });

  it('persists wing and floor through addRoom and addMultiOccupancyRoom', () => {
    db.addRoom('L101', { wing: 'East', floor: '2' });
    db.addMultiOccupancyRoom('205', ['A', 'B'], 'West', '3');
    const rooms = db.getState().rooms;
    expect(rooms.find(room => room.physicalRoomLabel === 'L101')).toMatchObject({ wing: 'East', floor: '2' });
    expect(rooms.find(room => room.physicalRoomLabel === '205')).toMatchObject({ wing: 'West', floor: '3' });
  });

  it('rejects a second current resident in the same occupancy position', () => {
    db.addRoom('L101');
    db.addResident({ firstName: 'Jane', lastName: 'One', roomNumber: 'L101', status: 'active' });
    expect(() => db.addResident({ firstName: 'John', lastName: 'Two', roomNumber: 'L101', status: 'active' })).toThrow(/occupied by Jane One/i);
  });

  it('requires a room for a current resident', () => {
    expect(() => db.addResident({ firstName: 'No', lastName: 'Room', roomNumber: ' ', status: 'active' })).toThrow(/required/i);
  });

  it('transfers without duplicating the resident and retains placement history', () => {
    db.addRoom('101A'); db.addRoom('204B');
    const resident = db.addResident({ firstName: 'Jane', lastName: 'Transfer', roomNumber: '101A', status: 'active' });
    db.updateResident(resident.id, { roomNumber: '204B' });
    const state = db.getState();
    expect(state.residents).toHaveLength(1);
    expect(state.residents[0].roomNumber).toBe('204B');
    expect(state.residentPlacementHistory.filter(item => item.residentId === resident.id)).toHaveLength(2);
    expect(state.residentPlacementHistory.find(item => item.displayLabel === '101A')?.endedAt).toBeTruthy();
  });

  it('hospital, pass and hold retain occupancy while permanent inactive releases it', () => {
    const resident = db.addResident({ firstName: 'Jane', lastName: 'Lifecycle', roomNumber: '101A', status: 'active' });
    const positionId = resident.occupancyPositionId;
    db.updateResident(resident.id, { status: 'in_hospital' }); expect(db.getState().residents[0].occupancyPositionId).toBe(positionId);
    db.updateResident(resident.id, { status: 'out_on_pass' }); expect(db.getState().residents[0].occupancyPositionId).toBe(positionId);
    db.updateResident(resident.id, { status: 'on_hold' }); expect(db.getState().residents[0].occupancyPositionId).toBe(positionId);
    db.updateResident(resident.id, { status: 'discharged' }); expect(db.getState().residents[0].occupancyPositionId).toBeUndefined();
    expect(() => db.addResident({ firstName: 'New', lastName: 'Occupant', roomNumber: '101A', status: 'active' })).not.toThrow();
  });

  it('migrates an existing label without guessing its physical-room meaning', () => {
    const backup = JSON.parse(db.backupDatabase());
    backup.residents = [{ id: 'legacy', firstName: 'Legacy', lastName: 'Resident', roomNumber: '101LF', status: 'active', source: 'imported' }];
    delete backup.rooms; delete backup.occupancyPositions; delete backup.residentPlacementHistory;
    db.restoreDatabase(JSON.stringify(backup));
    const state = db.getState();
    expect(state.residents[0].roomNumber).toBe('101LF');
    expect(state.rooms[0].physicalRoomLabel).toBe('101LF');
    expect(state.occupancyPositions[0].displayLabel).toBe('101LF');
  });

  it('migrates a legacy room "area" field into "wing"', () => {
    const backup = JSON.parse(db.backupDatabase());
    backup.residents = [{ id: 'legacy', firstName: 'Legacy', lastName: 'Resident', roomNumber: '101LF', status: 'active', source: 'imported' }];
    backup.rooms = [{ id: 'legacy-room', physicalRoomLabel: '101LF', area: 'West Wing', active: true, mode: 'simple', createdAt: new Date().toISOString(), source: 'imported' }];
    backup.occupancyPositions = [{ id: 'legacy-position', roomId: 'legacy-room', displayLabel: '101LF', active: true, createdAt: new Date().toISOString(), source: 'imported' }];
    delete backup.residentPlacementHistory;
    db.restoreDatabase(JSON.stringify(backup));
    const room = db.getState().rooms.find(item => item.physicalRoomLabel === '101LF');
    expect(room?.wing).toBe('West Wing');
    expect(room).not.toHaveProperty('area');
  });

  it('flags an imported current resident with no room instead of inventing one', () => {
    const backup = JSON.parse(db.backupDatabase());
    backup.residents = [{ id: 'invalid', firstName: 'Needs', lastName: 'Review', roomNumber: '', status: 'active', source: 'imported' }];
    db.restoreDatabase(JSON.stringify(backup));
    expect(db.getState().residents[0]).toMatchObject({ roomAssignmentNeedsReview: true, occupancyPositionId: undefined, roomNumber: '' });
  });

  it('provides Resident Census and Available Rooms while removing Residents Without Room', () => {
    db.addMultiOccupancyRoom('101', ['A', 'B']);
    db.addResident({ firstName: 'Jane', lastName: 'Census', roomNumber: '101A', status: 'active' });
    expect(SYSTEM_REPORT_PRESETS.some(report => report.id === 'residents-without-room')).toBe(false);
    const census = SYSTEM_REPORT_PRESETS.find(report => report.id === 'resident-census')!;
    const available = SYSTEM_REPORT_PRESETS.find(report => report.id === 'available-rooms')!;
    expect(buildCustomReportModel(census).rows.map(row => row.values.room)).toEqual(['101A']);
    expect(buildCustomReportModel(census).summaryItems?.find(item => item.label === 'Available Positions')?.value).toBe(1);
    expect(buildCustomReportModel(available).rows.map(row => row.values.room)).toEqual(['101B']);
  });
});
