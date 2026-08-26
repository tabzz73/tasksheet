// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';
import { db } from '../db';

describe('paused resident care entry safeguards', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('requires an explicit acknowledgement before configuring future care for a hospital resident', () => {
    const resident = db.addResident({
      firstName: 'Paused', lastName: 'Resident', roomNumber: '909', status: 'in_hospital',
    });
    const view = render(
      <GlobalAddModal
        isOpen
        initialType="care_task"
        contextResidentId={resident.id}
        onClose={() => undefined}
      />,
    );

    expect(view.getByRole('alert').textContent).toMatch(/Care generation is paused: In Hospital/i);
    expect(view.getByText(/cannot appear on a TaskSheet until the resident returns to Active/i)).not.toBeNull();
    expect(view.getByRole('checkbox', { name: /I understand and want to configure future care/i })).not.toBeNull();
  });
});
