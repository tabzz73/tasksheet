import { useState } from 'react';
import { AddEntityType } from '../components/modals/GlobalAddModal';
import { NavigationTab } from '../components/layout/Sidebar';
import { ConfirmDialogRequest } from '../components/common/ConfirmDialog';
import { Resident } from '../types';

interface NavigationContext {
  activeResidentId: string | null;
  activeShiftId: string | null;
  currentTab: NavigationTab;
}

export function useModalOrchestration(nav: NavigationContext) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialType, setAddModalInitialType] = useState<AddEntityType | undefined>(undefined);
  const [addModalContextResidentId, setAddModalContextResidentId] = useState<string | undefined>(undefined);
  const [addModalContextShiftId, setAddModalContextShiftId] = useState<string | undefined>(undefined);
  const [quickCareResident, setQuickCareResident] = useState<Resident | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);

  const openQuickAdd = (type?: AddEntityType, resId?: string, sId?: string) => {
    setAddModalInitialType(type);
    setAddModalContextResidentId(resId || (nav.activeResidentId && nav.currentTab === 'residents' ? nav.activeResidentId : undefined));
    setAddModalContextShiftId(sId || (nav.activeShiftId && nav.currentTab === 'shifts' ? nav.activeShiftId : undefined));
    setIsAddModalOpen(true);
  };

  const closeQuickAdd = () => {
    setIsAddModalOpen(false);
    setAddModalInitialType(undefined);
  };

  const requestConfirm = (request: ConfirmDialogRequest) => setConfirmRequest(request);
  const closeConfirm = () => setConfirmRequest(null);

  return {
    addModal: {
      isOpen: isAddModalOpen,
      initialType: addModalInitialType,
      contextResidentId: addModalContextResidentId,
      contextShiftId: addModalContextShiftId,
    },
    openQuickAdd,
    closeQuickAdd,
    quickCareResident,
    setQuickCareResident,
    confirmRequest,
    requestConfirm,
    closeConfirm,
  };
}
