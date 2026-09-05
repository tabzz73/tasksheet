// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { db } from '../db';
import { DemoModeBanner } from '../components/layout/DemoModeBanner';
import { SettingsView } from '../components/views/SettingsView';
import { getDemoState } from '../services/demoMode';
import { ROLE_HCA_ID } from '../data/defaultData';
import { createFirstAdmin } from '../services/auth';

describe('CM-P1-001 demo-to-production safety regression', () => {
  beforeEach(async () => {
    db.resetToInitialState();
    await createFirstAdmin({ displayName: 'Test Admin', username: 'test-admin', password: 'test-password-123' });
  });

  afterEach(() => {
    cleanup();
  });

  it('starts fresh with editable real setup and no demo facility, shifts, or operational data', () => {
    const state = db.getState();
    const setupState = getDemoState(state);

    expect(state.settings.dataMode).toBe('setup_required');
    expect(state.facility.siteName).toBe('');
    expect(state.shifts).toHaveLength(0);
    expect(state.residents).toHaveLength(0);
    expect(state.residentTasks).toHaveLength(0);
    expect(state.unitTasks).toHaveLength(0);
    expect(state.fyis).toHaveLength(0);
    expect(state.wounds).toHaveLength(0);
    expect(setupState.demoRecordsActive).toBe(false);
    expect(setupState.demoConfigurationActive).toBe(false);

    const setupMarkup = renderToStaticMarkup(
      <DemoModeBanner
        state={setupState}
        onStartRealSetup={() => undefined}
        onClearDemoData={() => undefined}
        onConfigureFacility={() => undefined}
      />,
    );
    expect(setupMarkup).toContain('Facility setup required');
    expect(setupMarkup).not.toContain('Demo data and sample facility configuration were cleared');
  });

  it('allows a fresh blank facility profile to be edited and saved', () => {
    const view = render(<SettingsView currentUser={db.getState().users[0]} onNavigateToWelcome={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: /Facility Setup/ }));
    const form = view.container.querySelector('form');
    const siteNameInput = view.getByLabelText('Facility or site name') as HTMLInputElement;
    const streetInput = view.getByLabelText('Street address') as HTMLInputElement;
    const cityInput = view.getByLabelText('City') as HTMLInputElement;
    const provinceInput = view.getByLabelText('Province or territory') as HTMLSelectElement;
    const postalInput = view.getByLabelText('Postal code') as HTMLInputElement;
    const phoneInput = view.getByLabelText('Main phone') as HTMLInputElement;

    expect(form).not.toBeNull();
    expect(siteNameInput.disabled).toBe(false);
    expect(siteNameInput.readOnly).toBe(false);

    fireEvent.change(siteNameInput, { target: { value: 'Real Facility' } });
    fireEvent.change(streetInput, { target: { value: '1 Main Street' } });
    fireEvent.change(cityInput, { target: { value: 'Edmonton' } });
    fireEvent.change(provinceInput, { target: { value: 'AB' } });
    fireEvent.change(postalInput, { target: { value: 'T1A 1A1' } });
    fireEvent.change(phoneInput, { target: { value: '780-555-0100' } });
    fireEvent.submit(form!);

    expect(db.getState().facility.siteName).toBe('Real Facility');
    expect(db.getState().facility.street).toBe('1 Main Street');
    expect(db.getState().facility.mainPhone).toBe('(780) 555-0100');
  });

  it('loads the Demo Mode workspace only after an explicit Settings action', () => {
    db.loadDemoData();
    const demoState = getDemoState(db.getState());
    const markup = renderToStaticMarkup(
      <DemoModeBanner
        state={demoState}
        onStartRealSetup={() => undefined}
        onClearDemoData={() => undefined}
        onConfigureFacility={() => undefined}
      />,
    );

    expect(db.getState().facility.siteName).toContain('Cedar Grove');
    expect(db.getState().shifts.some(shift => shift.source === 'demo')).toBe(true);
    expect(demoState.configurationMode).toBe('demo');
    expect(demoState.demoConfigurationActive).toBe(true);
    expect(demoState.demoRecordsActive).toBe(true);
    expect(markup).toContain('Demo Mode - Sample Data');
    expect(markup).toContain('Cedar Grove');
    expect(markup).toContain('Start Real Setup');
  });

  it('does not overwrite a partially entered real facility when demo is loaded', () => {
    db.updateFacility({ siteName: 'Facility Setup In Progress' });

    db.loadDemoData();

    const state = db.getState();
    expect(state.facility.siteName).toBe('Facility Setup In Progress');
    expect(state.settings.dataMode).toBe('setup_required');
    expect(state.shifts.some(shift => shift.source === 'demo')).toBe(true);
    expect(getDemoState(state).demoConfigurationActive).toBe(false);
    expect(getDemoState(state).demoRecordsActive).toBe(true);
  });

  it('clears Cedar Grove and demo shifts, completes real setup, and does not restore demo state', () => {
    db.loadDemoData();
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

  it('preserves a manually created task assigned to a demo shift when demo data is cleared', () => {
    db.loadDemoData();
    const demoShift = db.getState().shifts.find(shift => shift.source === 'demo');
    expect(demoShift).toBeDefined();

    const manualResident = db.addResident({
      firstName: 'Manual',
      lastName: 'OnDemoShift',
      roomNumber: 'M02',
      status: 'active',
    });
    const manualTask = db.addResidentTask({
      residentId: manualResident.id,
      shiftId: demoShift!.id,
      title: 'Manually Assigned Care Task',
      category: 'AM Care',
      frequency: 'daily',
      time: '0800',
    });
    expect(manualTask.source).toBe('manual');

    db.clearDemoData();
    const state = db.getState();

    // The manual task must never be deleted just because it referenced a demo shift.
    expect(state.residents.map(r => r.id)).toContain(manualResident.id);
    expect(state.residentTasks.map(t => t.id)).toContain(manualTask.id);

    const survivingTask = state.residentTasks.find(t => t.id === manualTask.id)!;
    // Its shiftId is cleared (the demo shift no longer exists) but its role is
    // preserved so it keeps generating for an equivalent real shift.
    expect(survivingTask.shiftId).toBeUndefined();
    expect(survivingTask.roleId).toBe(demoShift!.roleId);
  });

  it('migrates an RC1 backup with Cedar Grove demo data into explicit Demo Mode', () => {
    db.loadDemoData();
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
