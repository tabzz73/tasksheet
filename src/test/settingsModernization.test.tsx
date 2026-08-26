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

  it('uses grouped vertical navigation plus a mobile selector without a horizontal tab strip', () => {
    const view = render(<SettingsView onNavigateToWelcome={() => undefined} />);
    const sidebar = view.getByLabelText('Settings sections');
    const facilityButton = view.getByRole('button', { name: /Facility Setup/ });
    const printButton = view.getByRole('button', { name: /Print Profiles/ });
    const timingButton = view.getByRole('button', { name: /Care Timing Presets/ });
    const mobileSelector = view.getByLabelText('Settings section');

    expect(sidebar).not.toBeNull();
    expect(view.container.querySelector('.overflow-x-auto')).toBeNull();
    expect(facilityButton.getAttribute('aria-current')).toBe('page');
    expect(mobileSelector.tagName).toBe('SELECT');

    fireEvent.click(timingButton);
    expect(view.getByText('Facility Care Timing Presets')).not.toBeNull();
    expect(view.getAllByDisplayValue('0800').length).toBeGreaterThan(0);

    fireEvent.click(printButton);
    expect(printButton.getAttribute('aria-current')).toBe('page');
    expect(facilityButton.getAttribute('aria-current')).toBeNull();

    fireEvent.change(mobileSelector, { target: { value: 'quick_presets' } });
    expect((mobileSelector as HTMLSelectElement).value).toBe('quick_presets');
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

    fireEvent.click(view.getByRole('button', { name: /Developer Information/ }));
    expect(view.getByText('SoftVibeSolutions')).not.toBeNull();
    expect(view.getByText(/Local-first application storage/)).not.toBeNull();
  });

  it('formats contact and postal fields and provides province-aware city suggestions with free entry', () => {
    const view = render(<SettingsView onNavigateToWelcome={() => undefined} />);
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
