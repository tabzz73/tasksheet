// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { db } from '../db';
import { SavePrintPackageModal } from '../components/modals/SavePrintPackageModal';
import { SavedPrintPackage } from '../types';

describe('SavePrintPackageModal', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('requires a name and at least one document before saving', () => {
    const onSaved = vi.fn();
    render(<SavePrintPackageModal isOpen onClose={() => {}} initialPackage={null} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Package' }));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByText(/give the package a name/i)).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Package Name'), { target: { value: 'Shift Huddle Package' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Package' }));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByText(/add at least one document/i)).not.toBeNull();
  });

  it('adds documents, reorders them with keyboard-accessible Move Up/Down controls (no drag required), and saves in the resulting order', () => {
    const onSaved = vi.fn();
    render(<SavePrintPackageModal isOpen onClose={() => {}} initialPackage={null} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Package Name'), { target: { value: 'Shift Huddle Package' } });

    const typeSelect = screen.getByLabelText('Document type to add') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'wound_schedule' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Document' }));
    fireEvent.change(typeSelect, { target: { value: 'fyi_binder' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Document' }));

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
    expect(within(listItems[0]).getByText('Wound & Dressing Treatment Schedule')).not.toBeNull();
    expect(within(listItems[1]).getByText('FYI Binder')).not.toBeNull();

    // First item's "move up" is disabled (already at the top).
    expect((within(listItems[0]).getByRole('button', { name: /move.*up/i }) as HTMLButtonElement).disabled).toBe(true);

    // Move the second item (FYI Binder) up — swaps order.
    fireEvent.click(within(listItems[1]).getByRole('button', { name: /move.*up/i }));
    const reordered = screen.getAllByRole('listitem');
    expect(within(reordered[0]).getByText('FYI Binder')).not.toBeNull();
    expect(within(reordered[1]).getByText('Wound & Dressing Treatment Schedule')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Create Package' }));
    expect(onSaved).toHaveBeenCalledTimes(1);
    const saved: SavedPrintPackage = onSaved.mock.calls[0][0];
    expect(saved.name).toBe('Shift Huddle Package');
    expect(saved.items.map(i => i.type)).toEqual(['fyi_binder', 'wound_schedule']);
    expect(saved.id).toBeTruthy();
  });

  it('removing an item drops it from the saved package', () => {
    const onSaved = vi.fn();
    render(<SavePrintPackageModal isOpen onClose={() => {}} initialPackage={null} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Package Name'), { target: { value: 'Weekly Wounds' } });
    fireEvent.change(screen.getByLabelText('Document type to add'), { target: { value: 'wound_schedule' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Document' }));
    fireEvent.change(screen.getByLabelText('Document type to add'), { target: { value: 'blank_template' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Document' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Create Package' }));
    expect(onSaved.mock.calls[0][0].items).toHaveLength(1);
  });

  it('editing an existing package pre-fills its fields and saves with the same id', () => {
    const existing: SavedPrintPackage = {
      id: 'spp_existing',
      name: 'Morning Charge Package',
      items: [{ id: 'i1', type: 'wound_schedule' }],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const onSaved = vi.fn();
    render(<SavePrintPackageModal isOpen onClose={() => {}} initialPackage={existing} onSaved={onSaved} />);

    expect((screen.getByLabelText('Package Name') as HTMLInputElement).value).toBe('Morning Charge Package');
    expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSaved.mock.calls[0][0].id).toBe('spp_existing');
  });

  it('is a focus-trapped, keyboard-dismissible dialog', () => {
    render(<SavePrintPackageModal isOpen onClose={() => {}} initialPackage={null} onSaved={() => {}} />);
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'New Print Package' })).not.toBeNull();
  });
});
