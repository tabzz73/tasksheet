// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { db } from '../db';
import { SettingsView } from '../components/views/SettingsView';
import { CareTimingSettingsTab } from '../components/views/CareTimingSettingsTab';
import { Sidebar } from '../components/layout/Sidebar';
import packageJson from '../../package.json';
import { TASKSHEET_TAGLINE } from '../constants/branding';

describe('modern Settings navigation and smart facility entry', () => {
  beforeEach(() => {
    db.resetToDemoState();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a grouped landing menu and drills into a section with no persistent rail', () => {
    const view = render(<SettingsView onNavigateToWelcome={() => undefined} />);

    // The old always-visible control-center rail and mobile <select> are gone —
    // the landing menu itself is the only place a section is chosen.
    expect(view.queryByLabelText('Settings sections')).toBeNull();
    expect(view.queryByLabelText('Settings section')).toBeNull();
    expect(view.container.querySelector('.overflow-x-auto')).toBeNull();

    // Every section is directly reachable from the landing menu without expanding a group first.
    const facilityButton = view.getByRole('button', { name: /Facility Setup/ });
    const timingButton = view.getByRole('button', { name: /Care Timing Presets/ });
    const printButton = view.getByRole('button', { name: /Print Profiles/ });
    expect(facilityButton).not.toBeNull();
    expect(timingButton).not.toBeNull();
    expect(printButton).not.toBeNull();

    fireEvent.click(timingButton);
    expect(view.getByText('Facility Care Timing Presets')).not.toBeNull();
    expect(view.getAllByDisplayValue('0800').length).toBeGreaterThan(0);
    // Inside a section, the landing menu (and its other rows) is no longer rendered.
    expect(view.queryByRole('button', { name: /Facility Setup/ })).toBeNull();

    fireEvent.click(view.getByRole('button', { name: '← All Settings' }));
    fireEvent.click(view.getByRole('button', { name: /Print Profiles/ }));
    expect(view.getByText('Print Density & Typography')).not.toBeNull();

    fireEvent.click(view.getByRole('button', { name: '← All Settings' }));
    fireEvent.click(view.getByRole('button', { name: /Quick Add Presets/ }));
    expect(view.getByText('Facility Quick Add Presets Manager')).not.toBeNull();
  });

  it('keeps Welcome & Overview out of primary navigation and under App Information', () => {
    const sidebar = render(
      <Sidebar
        currentTab="dashboard"
        onTabChange={() => undefined}
        onOpenQuickAdd={() => undefined}
      />,
    );
    expect(sidebar.queryByText('Welcome & Overview')).toBeNull();
    expect(sidebar.getByText(TASKSHEET_TAGLINE)).not.toBeNull();
    sidebar.unmount();

    const view = render(<SettingsView onNavigateToWelcome={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: /App Information/ }));
    expect(view.getByRole('button', { name: /Open Welcome & Overview/ })).not.toBeNull();
    expect(view.getByText(packageJson.version)).not.toBeNull();
    expect(view.getByText(TASKSHEET_TAGLINE)).not.toBeNull();

    fireEvent.click(view.getByRole('button', { name: '← All Settings' }));
    fireEvent.click(view.getByRole('button', { name: /Developer Information/ }));
    expect(view.getByText('SoftVibeSolutions')).not.toBeNull();
    expect(view.getByText(/Local-first application storage/)).not.toBeNull();
  });

  it('formats contact and postal fields and provides province-aware city suggestions with free entry', () => {
    const view = render(<SettingsView onNavigateToWelcome={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: /Facility Setup/ }));
    const phone = view.getByLabelText('Main phone') as HTMLInputElement;
    const postalCode = view.getByLabelText('Postal code') as HTMLInputElement;
    const province = view.getByLabelText('Province or territory') as HTMLSelectElement;
    const city = view.getByLabelText('City') as HTMLInputElement;

    fireEvent.change(phone, { target: { value: '7805550199' } });
    fireEvent.change(postalCode, { target: { value: 't6w2p3' } });
    fireEvent.change(province, { target: { value: 'BC' } });
    fireEvent.change(city, { target: { value: 'Custom Municipality' } });

    expect(phone.value).toBe('(780) 555-0199');
    expect(postalCode.value).toBe('T6W 2P3');
    expect(province.value).toBe('BC');
    expect(city.value).toBe('Custom Municipality');
    expect(view.container.querySelector('datalist option[value="Vancouver"]')).not.toBeNull();
  });

  it('saves editable facility medication and meal timing presets', () => {
    const feedback: Array<{ type: string; text: string }> = [];
    const view = render(<CareTimingSettingsTab onShowFeedback={(type, text) => feedback.push({ type, text })} />);
    const morning = view.getByLabelText('Morning medications time') as HTMLInputElement;

    fireEvent.change(morning, { target: { value: '0830' } });
    fireEvent.click(view.getByRole('button', { name: 'Save Timing Presets' }));

    expect(db.getState().settings.careTimingPresets?.medicationTimes[0].time).toBe('0830');
    expect(feedback[feedback.length - 1]?.type).toBe('success');
  });
});
