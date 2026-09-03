import { useState } from 'react';
import { db } from '../db';
import { NavigationTab } from '../components/layout/Sidebar';
import { getTodayLocalDateString } from '../services/recurrence';

const WELCOME_DISMISSED_KEY = 'tasksheet_welcome_dismissed';

function getInitialTab(): NavigationTab {
  const welcomeSetting = db.getState().settings.welcomeHero?.showWelcomePage || 'on_first_launch';
  if (welcomeSetting === 'always') return 'welcome';
  if (welcomeSetting === 'on_first_launch' && !localStorage.getItem(WELCOME_DISMISSED_KEY)) {
    return 'welcome';
  }
  return 'dashboard';
}

export function useNavigation() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>(getInitialTab);
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayLocalDateString());
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [navigationResetToken, setNavigationResetToken] = useState(0);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);

  const openShift = (shiftId: string) => {
    setActiveShiftId(shiftId);
    setCurrentTab('shifts');
  };

  const openResident = (residentId: string) => {
    setActiveResidentId(residentId);
    setCurrentTab('residents');
  };

  const closeShift = () => setActiveShiftId(null);
  const closeResident = () => setActiveResidentId(null);

  const changeTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    // Sidebar/tab navigation always targets the section root. Detail views are
    // opened explicitly through openShift/openResident, so clicking
    // Shifts or Residents again should work as a reliable parent-navigation action.
    setActiveShiftId(null);
    setActiveResidentId(null);
  };

  const changeTabFromSidebar = (tab: NavigationTab) => {
    if (tab === 'welcome') setIsPresentationMode(false);
    setNavigationResetToken(token => token + 1);
    changeTab(tab);
  };

  return {
    currentTab,
    currentDate,
    setCurrentDate,
    activeShiftId,
    activeResidentId,
    isPresentationMode,
    setIsPresentationMode,
    navigationResetToken,
    openShift,
    openResident,
    closeShift,
    closeResident,
    changeTab,
    changeTabFromSidebar,
  };
}
