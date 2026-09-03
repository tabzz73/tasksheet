// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { db } from '../db';

describe('sidebar parent navigation', () => {
  beforeEach(() => {
    db.resetToDemoState();
    localStorage.setItem('tasksheet_welcome_dismissed', 'true');
    localStorage.setItem('tasksheet_shifts_view_mode', 'list');
    localStorage.setItem('tasksheet_residents_view_mode', 'list');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('returns from a shift workspace to the Shifts list when Shifts is clicked again', () => {
    const shift = db.getState().shifts.find(item => item.isActive !== false)!;
    const view = render(<App />);
    const desktopSidebar = view.container.querySelector('aside')!;
    const shiftsNav = within(desktopSidebar).getByRole('button', { name: 'Shifts' });

    fireEvent.click(shiftsNav);
    const shiftNavigation = screen.getByRole('button', { name: `Open ${shift.shortCode || shift.name} shift` });
    fireEvent.click(shiftNavigation);
    expect(screen.getByText(`Add to ${shift.shortCode || shift.name} ▾`)).not.toBeNull();

    fireEvent.click(shiftsNav);
    expect(screen.getByRole('heading', { name: 'Shifts' })).not.toBeNull();
    expect(screen.queryByText(`Add to ${shift.shortCode || shift.name} ▾`)).toBeNull();
  });

  it('returns from a resident profile to the Residents list when Residents is clicked again', () => {
    const resident = db.getState().residents[0];
    const view = render(<App />);
    const desktopSidebar = view.container.querySelector('aside')!;
    const residentsNav = within(desktopSidebar).getByRole('button', { name: 'Residents' });

    fireEvent.click(residentsNav);
    const residentName = `${resident.firstName} ${resident.lastName}`;
    const residentNavigation = screen.getByRole('button', { name: `Open resident ${residentName}` });
    fireEvent.click(residentNavigation);
    expect(screen.getByRole('heading', { name: residentName })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Back to Residents Directory' })).not.toBeNull();

    fireEvent.click(residentsNav);
    expect(screen.getByRole('heading', { name: 'Residents' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Back to Residents Directory' })).toBeNull();
  });

  it('resets Print Center, FYI Binder, and Settings to their section roots when reselected', () => {
    const view = render(<App />);
    const desktopSidebar = view.container.querySelector('aside')!;

    const printCenterNav = within(desktopSidebar).getByRole('button', { name: 'Print Center' });
    fireEvent.click(printCenterNav);
    const shift = db.getState().shifts.find(item => item.isActive !== false)!;
    fireEvent.click(screen.getByRole('button', { name: `Select ${shift.shortCode || shift.name} for batch print` }));
    expect(screen.getByText('Print Selected (1)')).not.toBeNull();
    fireEvent.click(printCenterNav);
    expect(screen.queryByText('Print Selected (1)')).toBeNull();

    const binderNav = within(desktopSidebar).getByRole('button', { name: /FYI Binder/ });
    fireEvent.click(binderNav);
    const binderSearch = screen.getByPlaceholderText('Search standing notes or rooms...') as HTMLInputElement;
    fireEvent.change(binderSearch, { target: { value: 'wound' } });
    fireEvent.click(screen.getByRole('button', { name: 'HCA Scope' }));
    expect(binderSearch.value).toBe('wound');
    fireEvent.click(binderNav);
    expect(binderSearch.value).toBe('');

    const settingsNav = within(desktopSidebar).getByRole('button', { name: 'Settings' });
    fireEvent.click(settingsNav);
    const facilityName = screen.getByRole('textbox', { name: 'Facility or site name' }) as HTMLInputElement;
    fireEvent.change(facilityName, { target: { value: 'Unsaved Facility Name' } });
    fireEvent.click(screen.getByRole('button', { name: /Developer Information/ }));
    expect(screen.getByRole('heading', { name: 'Developer Information' })).not.toBeNull();
    fireEvent.click(settingsNav);
    expect(screen.getByRole('heading', { name: 'Facility Profile & Print Header' })).not.toBeNull();
    expect((screen.getByRole('textbox', { name: 'Facility or site name' }) as HTMLInputElement).value).toBe('Unsaved Facility Name');
  });
});
