// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useModalOrchestration } from '../app/useModalOrchestration';
import { NavigationTab } from '../components/layout/Sidebar';

interface NavProps {
  activeResidentId: string | null;
  activeShiftId: string | null;
  currentTab: NavigationTab;
}

function setup(initialNav: NavProps) {
  return renderHook((nav: NavProps) => useModalOrchestration(nav), { initialProps: initialNav });
}

describe('useModalOrchestration', () => {
  it('starts closed with no context', () => {
    const { result } = setup({ activeResidentId: null, activeShiftId: null, currentTab: 'dashboard' });
    expect(result.current.addModal.isOpen).toBe(false);
    expect(result.current.addModal.contextResidentId).toBeUndefined();
    expect(result.current.addModal.contextShiftId).toBeUndefined();
  });

  it('openQuickAdd inherits the active resident when on the residents tab', () => {
    const { result } = setup({ activeResidentId: 'res-1', activeShiftId: null, currentTab: 'residents' });
    act(() => result.current.openQuickAdd('care_task'));
    expect(result.current.addModal.isOpen).toBe(true);
    expect(result.current.addModal.initialType).toBe('care_task');
    expect(result.current.addModal.contextResidentId).toBe('res-1');
  });

  it('openQuickAdd does not inherit the active resident when on a different tab', () => {
    const { result } = setup({ activeResidentId: 'res-1', activeShiftId: null, currentTab: 'dashboard' });
    act(() => result.current.openQuickAdd('care_task'));
    expect(result.current.addModal.contextResidentId).toBeUndefined();
  });

  it('an explicit resId/sId argument overrides the inherited context', () => {
    const { result } = setup({ activeResidentId: 'res-1', activeShiftId: 'shift-1', currentTab: 'shifts' });
    act(() => result.current.openQuickAdd('care_task', 'res-explicit', 'shift-explicit'));
    expect(result.current.addModal.contextResidentId).toBe('res-explicit');
    expect(result.current.addModal.contextShiftId).toBe('shift-explicit');
  });

  it('closeQuickAdd closes the modal and clears the initial type', () => {
    const { result } = setup({ activeResidentId: null, activeShiftId: null, currentTab: 'dashboard' });
    act(() => result.current.openQuickAdd('resident'));
    act(() => result.current.closeQuickAdd());
    expect(result.current.addModal.isOpen).toBe(false);
    expect(result.current.addModal.initialType).toBeUndefined();
  });

  it('requestConfirm/closeConfirm drive the confirm dialog request', () => {
    const { result } = setup({ activeResidentId: null, activeShiftId: null, currentTab: 'dashboard' });
    act(() => result.current.requestConfirm({ title: 'Delete?', message: 'Sure?', confirmLabel: 'Delete', onConfirm: () => {} }));
    expect(result.current.confirmRequest?.title).toBe('Delete?');
    act(() => result.current.closeConfirm());
    expect(result.current.confirmRequest).toBeNull();
  });
});
