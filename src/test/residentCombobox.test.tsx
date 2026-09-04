// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ResidentCombobox } from '../components/common/ResidentCombobox';
import { Resident } from '../types';

afterEach(() => cleanup());

function makeResident(overrides: Partial<Resident> & { id: string; firstName: string; lastName: string; roomNumber: string }): Resident {
  return { status: 'active', ...overrides } as Resident;
}

const RESIDENTS: Resident[] = [
  makeResident({ id: 'r-250', firstName: 'Jane', lastName: 'Smith', roomNumber: '250' }),
  makeResident({ id: 'r-251', firstName: 'Robert', lastName: 'Lee', roomNumber: '251' }),
  makeResident({ id: 'r-254a', firstName: 'Mary', lastName: 'Jones', roomNumber: '254A' }),
  makeResident({ id: 'r-118', firstName: 'Margaret', lastName: 'Brown', roomNumber: '118' }),
  makeResident({ id: 'r-204', firstName: 'John', lastName: 'Smith', roomNumber: '204', status: 'in_hospital' }),
];

/** A thin controlled-state harness so tests exercise the component the way
 *  a real form would (value/onChange round-tripping), including reopening
 *  it fresh — the exact shape every call site in the app uses. */
const Harness: React.FC<{
  residents?: Resident[];
  initialValue?: string;
  required?: boolean;
  allowClear?: boolean;
}> = ({ residents = RESIDENTS, initialValue = '', required, allowClear }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <div>
      <label htmlFor="res-combo">Resident</label>
      <ResidentCombobox id="res-combo" residents={residents} value={value} onChange={setValue} required={required} allowClear={allowClear} />
      <p data-testid="current-value">{value}</p>
    </div>
  );
};

describe('ResidentCombobox — no implicit selection', () => {
  it('starts empty with the placeholder and no resident selected, even with residents available', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Resident') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('Search resident...');
    expect(screen.getByTestId('current-value').textContent).toBe('');
  });

  it('does not select the first resident just because the field was focused/opened', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText('Resident'));
    expect(screen.getByTestId('current-value').textContent).toBe('');
  });
});

describe('ResidentCombobox — type-to-search', () => {
  it('filters by room number, in natural room order', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: '25' } });
    const options = screen.getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(['250 · Jane Smith', '251 · Robert Lee', '254A · Mary Jones']);
  });

  it('filters by first name', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'robert' } });
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['251 · Robert Lee']);
  });

  it('filters by last name', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'brown' } });
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['118 · Margaret Brown']);
  });

  it('filters by full name and matches case-insensitively', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'MARY jones' } });
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['254A · Mary Jones']);
  });

  it('matches multiple residents across name fields, per the "mar" example', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'mar' } });
    const options = screen.getAllByRole('option').map(o => o.textContent);
    expect(options).toContain('254A · Mary Jones');
    expect(options).toContain('118 · Margaret Brown');
  });

  it('shows "No matching residents." when nothing matches', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'zzz-nobody' } });
    expect(screen.getByText('No matching residents.')).not.toBeNull();
  });

  it('shows "No residents available." when the resident list is empty', () => {
    render(<Harness residents={[]} />);
    fireEvent.click(screen.getByLabelText('Resident'));
    expect(screen.getByText('No residents available.')).not.toBeNull();
  });
});

describe('ResidentCombobox — selection', () => {
  it('mouse selection commits the value and displays the canonical Room · First Last label', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'Lee' } });
    fireEvent.click(screen.getByRole('option', { name: '251 · Robert Lee' }));
    expect(screen.getByTestId('current-value').textContent).toBe('r-251');
    expect((screen.getByLabelText('Resident') as HTMLInputElement).value).toBe('251 · Robert Lee');
  });

  it('keyboard ArrowDown + Enter selects the active option', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Resident');
    fireEvent.change(input, { target: { value: '25' } }); // 250, 251, 254A
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // -> index 0 (250)
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // -> index 1 (251)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('current-value').textContent).toBe('r-251');
  });

  it('Escape closes the list and reverts unsaved typing without changing the selection', () => {
    render(<Harness initialValue="r-250" />);
    const input = screen.getByLabelText('Resident') as HTMLInputElement;
    expect(input.value).toBe('250 · Jane Smith');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByTestId('current-value').textContent).toBe('r-250');
    expect(input.value).toBe('250 · Jane Smith');
  });

  it('Tab does not select anything on its own — the value stays whatever it already was', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Resident');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.getByTestId('current-value').textContent).toBe('');
  });

  it('blurring without picking an option reverts the input text to the prior selection', () => {
    render(<Harness initialValue="r-250" />);
    const input = screen.getByLabelText('Resident') as HTMLInputElement;
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'nothing matches this' } });
    fireEvent.blur(input);
    expect(input.value).toBe('250 · Jane Smith');
    expect(screen.getByTestId('current-value').textContent).toBe('r-250');
  });
});

describe('ResidentCombobox — status-aware display', () => {
  it('shows a visible status label for a non-active resident rather than excluding them', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'John' } });
    expect(screen.getByRole('option', { name: '204 · John Smith · In Hospital' })).not.toBeNull();
  });

  it('shows no status suffix for an active resident', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'Jane' } });
    expect(screen.getByRole('option', { name: '250 · Jane Smith' })).not.toBeNull();
  });
});

describe('ResidentCombobox — edit-mode preselection and reopen behavior', () => {
  it('shows the currently assigned resident when a value is passed in up front', () => {
    render(<Harness initialValue="r-254a" />);
    expect((screen.getByLabelText('Resident') as HTMLInputElement).value).toBe('254A · Mary Jones');
  });

  it('a fresh mount with no value never retains a previous session\'s resident (modal reopen safety)', () => {
    const { unmount } = render(<Harness initialValue="r-254a" />);
    expect((screen.getByLabelText('Resident') as HTMLInputElement).value).toBe('254A · Mary Jones');
    unmount();

    render(<Harness initialValue="" />);
    expect((screen.getByLabelText('Resident') as HTMLInputElement).value).toBe('');
  });

  it('gracefully falls back to just the name when roomNumber is empty, without breaking the layout', () => {
    const noRoom = makeResident({ id: 'r-noroom', firstName: 'No', lastName: 'Room', roomNumber: '' });
    render(<Harness residents={[noRoom]} initialValue="r-noroom" />);
    expect((screen.getByLabelText('Resident') as HTMLInputElement).value).toBe('No Room');
  });
});

describe('ResidentCombobox — clear control', () => {
  it('shows a clear control for an optional field once a resident is selected, and clearing empties the value', () => {
    render(<Harness initialValue="r-250" />);
    const clearButton = screen.getByRole('button', { name: 'Clear selected resident' });
    fireEvent.click(clearButton);
    expect(screen.getByTestId('current-value').textContent).toBe('');
  });

  it('does not show a clear control for a required field with no selection', () => {
    render(<Harness required />);
    expect(screen.queryByRole('button', { name: 'Clear selected resident' })).toBeNull();
  });
});

describe('ResidentCombobox — accessibility', () => {
  it('exposes combobox/listbox roles, aria-expanded, and an active-descendant while navigating', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Resident');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox')).not.toBeNull();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)).not.toBeNull();
  });

  it('marks the field aria-required when required, and not otherwise', () => {
    render(<Harness required />);
    expect(screen.getByLabelText('Resident').getAttribute('aria-required')).toBe('true');
    cleanup();
    render(<Harness />);
    expect(screen.getByLabelText('Resident').getAttribute('aria-required')).toBeNull();
  });
});
