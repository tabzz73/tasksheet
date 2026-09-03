// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { EmergencyCodesTab } from '../components/views/EmergencyCodesTab';
import { DEFAULT_EMERGENCY_CODES } from '../data/defaultData';

describe('EmergencyCodesTab', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('seeds the verified AHS Policy #1181 Appendix A code catalog (10 codes)', () => {
    expect(DEFAULT_EMERGENCY_CODES).toHaveLength(10);
    expect(DEFAULT_EMERGENCY_CODES.map(c => `${c.code}:${c.name}`)).toEqual([
      'Blue:Cardiac Arrest / Medical Emergency',
      'Red:Fire',
      'White:Violence / Aggression',
      'Purple:Hostage',
      'Yellow:Missing Person',
      'Black:Bomb Threat',
      'Grey:Air Quality Concerns',
      'Green:Evacuation',
      'Brown:Hazardous Spill / Release',
      'Orange:Mass Casualty Incident',
    ]);
    render(<EmergencyCodesTab onShowFeedback={() => undefined} />);
    expect(screen.getByText('Code Red')).not.toBeNull();
    expect(screen.getByText('Fire')).not.toBeNull();
  });

  it('enabling Code of the Month and choosing a code persists to settings', () => {
    render(<EmergencyCodesTab onShowFeedback={() => undefined} />);
    fireEvent.click(screen.getByLabelText(/Show "Code of the Month"/));
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'code-red' } });
    expect(db.getState().settings.codeOfTheMonthEnabled).toBe(true);
    expect(db.getState().settings.codeOfTheMonthId).toBe('code-red');
  });

  it('adds a facility-specific code and lets it be removed', () => {
    const feedback: string[] = [];
    render(<EmergencyCodesTab onShowFeedback={(_, text) => feedback.push(text)} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. 66'), { target: { value: '99' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Site-specific alert'), { target: { value: 'Elevator Entrapment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Code' }));
    expect(db.getState().settings.emergencyCodes?.some(c => c.code === '99' && !c.isSystem)).toBe(true);
    expect(screen.getByText('Code 99')).not.toBeNull();
  });

  it('Restore Defaults refreshes system codes but keeps facility-added ones', () => {
    render(<EmergencyCodesTab onShowFeedback={() => undefined} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. 66'), { target: { value: '99' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Site-specific alert'), { target: { value: 'Custom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Code' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restore Defaults' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Restore Defaults' }));

    const codes = db.getState().settings.emergencyCodes || [];
    expect(codes.filter(c => c.isSystem)).toHaveLength(10);
    expect(codes.some(c => c.code === '99')).toBe(true);
  });
});
