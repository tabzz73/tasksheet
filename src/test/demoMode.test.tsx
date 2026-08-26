import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { db } from '../db';
import { DemoModeBanner } from '../components/layout/DemoModeBanner';
import { getDemoState } from '../services/demoMode';
import { ROLE_HCA_ID } from '../data/defaultData';

describe('CM-P1-001 demo-to-production safety regression', () => {
  beforeEach(() => {
    db.resetToInitialState();
  });

  it('shows an obvious persistent Demo Mode banner for a fresh RC2 state', () => {
    const demoState = getDemoState(db.getState());
    const markup = renderToStaticMarkup(
      <DemoModeBanner
        state={demoState}
        onStartRealSetup={() => undefined}
        onClearDemoData={() => undefined}
        onConfigureFacility={() => undefined}
      />,
    );

    expect(demoState.configurationMode).toBe('demo');
    expect(demoState.demoConfigurationActive).toBe(true);
    expect(demoState.demoRecordsActive).toBe(true);
    expect(markup).toContain('Demo Mode - Sample Data');
    expect(markup).toContain('Cedar Grove');
    expect(markup).toContain('Start Real Setup');
  });

  it('clears Cedar Grove and demo shifts, completes real setup, and does not restore demo state', () => {
    const catalogCount = db.getState().catalogTaskTemplates.length;

    db.startRealSetup();
    let state = db.getState();
    expect(state.settings.dataMode).toBe('setup_required');
    expect(state.facility.siteName).toBe('');
    expect(state.shifts).toHaveLength(0);
    expect(state.residents.some(record => record.source === 'demo')).toBe(false);
    expect(state.residentTasks.some(record => record.source === 'demo')).toBe(false);
    expect(state.unitTasks.some(record => record.source === 'demo')).toBe(false);
    expect(state.fyis.some(record => record.source === 'demo')).toBe(false);
    expect(state.wounds.some(record => record.source === 'demo')).toBe(false);
    expect(state.catalogTaskTemplates).toHaveLength(catalogCount);

    db.updateFacility({
      siteName: 'Pilot Validation Facility',
      unitName: 'Unit A',
      street: '1 Validation Way',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T1A 1A1',
      mainPhone: '403-555-0200',
    });
    const realShift = db.addShift({
      name: 'HCA Pilot Day',
      shortCode: 'PD1',
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500',
      isActive: true,
    });

    state = db.getState();
    expect(realShift.source).toBe('manual');
    expect(state.settings.dataMode).toBe('operational');
    expect(getDemoState(state).showDemoIndicator).toBe(false);

    const persistedState = db.backupDatabase();
    db.restoreDatabase(persistedState);
    state = db.getState();
    expect(state.facility.siteName).toBe('Pilot Validation Facility');
    expect(state.shifts.map(shift => shift.shortCode)).toEqual(['PD1']);
    expect(state.settings.dataMode).toBe('operational');
    expect(getDemoState(state).showDemoIndicator).toBe(false);
  });

  it('reloads and clears demo records without overwriting manual production records', () => {
    db.startRealSetup();
    db.updateFacility({
      siteName: 'Manual Production Facility',
      street: '2 Production Way',
      city: 'Edmonton',
      province: 'AB',
      postalCode: 'T2B 2B2',
      mainPhone: '780-555-0300',
    });
    const manualShift = db.addShift({
      name: 'Manual HCA Day',
      shortCode: 'MD1',
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500',
      isActive: true,
    });
    const manualResident = db.addResident({
      firstName: 'Manual',
      lastName: 'Resident',
      roomNumber: 'M01',
      status: 'active',
    });
    const manualTask = db.addResidentTask({
      residentId: manualResident.id,
      shiftId: manualShift.id,
      title: 'Manual Care Task',
      category: 'AM Care',
      frequency: 'daily',
      time: '0800',
    });

    db.loadDemoData();
    let state = db.getState();
    expect(state.facility.siteName).toBe('Manual Production Facility');
    expect(state.shifts.some(shift => shift.id === manualShift.id)).toBe(true);
    expect(state.residents.some(resident => resident.id === manualResident.id)).toBe(true);
    expect(state.residentTasks.some(task => task.id === manualTask.id)).toBe(true);
    expect(getDemoState(state).demoRecordsActive).toBe(true);
    expect(getDemoState(state).demoConfigurationActive).toBe(false);

    db.clearDemoData();
    state = db.getState();
    expect(state.facility.siteName).toBe('Manual Production Facility');
    expect(state.shifts.map(shift => shift.id)).toContain(manualShift.id);
    expect(state.residents.map(resident => resident.id)).toContain(manualResident.id);
    expect(state.residentTasks.map(task => task.id)).toContain(manualTask.id);
    expect(state.residents.some(record => record.source === 'demo')).toBe(false);
    expect(state.residentTasks.some(record => record.source === 'demo')).toBe(false);
    expect(getDemoState(state).showDemoIndicator).toBe(false);
  });

  it('migrates an RC1 backup with Cedar Grove demo data into explicit Demo Mode', () => {
    const legacyBackup = JSON.parse(db.backupDatabase());
    delete legacyBackup.settings.dataMode;
    legacyBackup.shifts = legacyBackup.shifts.map((shift: Record<string, unknown>) => {
      const { source: _source, ...legacyShift } = shift;
      return legacyShift;
    });

    db.restoreDatabase(JSON.stringify(legacyBackup));
    const state = db.getState();
    expect(state.settings.dataMode).toBe('demo');
    expect(state.shifts.every(shift => shift.source === 'demo')).toBe(true);
    expect(getDemoState(state).demoConfigurationActive).toBe(true);
  });
});
