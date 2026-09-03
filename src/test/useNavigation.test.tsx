// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useNavigation } from '../app/useNavigation';

describe('useNavigation', () => {
  beforeEach(() => {
    localStorage.setItem('tasksheet_welcome_dismissed', 'true');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts on dashboard once welcome has been dismissed', () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.currentTab).toBe('dashboard');
    expect(result.current.activeShiftId).toBeNull();
    expect(result.current.activeResidentId).toBeNull();
  });

  it('openShift sets the active shift and switches to the shifts tab', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.openShift('shift-1'));
    expect(result.current.activeShiftId).toBe('shift-1');
    expect(result.current.currentTab).toBe('shifts');
  });

  it('openResident sets the active resident and switches to the residents tab', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.openResident('resident-1'));
    expect(result.current.activeResidentId).toBe('resident-1');
    expect(result.current.currentTab).toBe('residents');
  });

  it('closeShift/closeResident clear the active sub-view without changing tabs', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.openShift('shift-1'));
    act(() => result.current.closeShift());
    expect(result.current.activeShiftId).toBeNull();
    expect(result.current.currentTab).toBe('shifts');

    act(() => result.current.openResident('resident-1'));
    act(() => result.current.closeResident());
    expect(result.current.activeResidentId).toBeNull();
    expect(result.current.currentTab).toBe('residents');
  });

  it('changeTab resets any active shift/resident sub-view (parent-navigation reset)', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => result.current.openShift('shift-1'));
    act(() => result.current.changeTab('shifts'));
    expect(result.current.activeShiftId).toBeNull();
    expect(result.current.currentTab).toBe('shifts');
  });

  it('changeTabFromSidebar bumps navigationResetToken and clears presentation mode when leaving to welcome', () => {
    const { result } = renderHook(() => useNavigation());
    const initialToken = result.current.navigationResetToken;
    act(() => result.current.setIsPresentationMode(true));

    act(() => result.current.changeTabFromSidebar('welcome'));
    expect(result.current.currentTab).toBe('welcome');
    expect(result.current.isPresentationMode).toBe(false);
    expect(result.current.navigationResetToken).toBe(initialToken + 1);
  });
});
