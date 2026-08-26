import React, { useState, useEffect } from 'react';
import { db } from './db';
import { AppDatabaseState, Resident, Shift } from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ShiftsView } from './components/views/ShiftsView';
import { ShiftWorkspaceView } from './components/views/ShiftWorkspaceView';
import { ResidentsView } from './components/views/ResidentsView';
import { ResidentProfileView } from './components/views/ResidentProfileView';
import { FYIBinderView } from './components/views/FYIBinderView';
import { ReportsPrintView } from './components/views/ReportsPrintView';
import { SettingsView } from './components/views/SettingsView';
import { WelcomeHeroView } from './components/views/WelcomeHeroView';
import { GlobalAddModal, AddEntityType } from './components/modals/GlobalAddModal';
import { QuickCareSetupModal } from './components/modals/QuickCareSetupModal';
import { PrintModal } from './components/modals/PrintModal';
import { PrintPreviewPage, SpecializedPrintDoc } from './components/views/PrintPreviewPage';
import { PrintDocumentModel } from './services/print';
import { PrintPackageModel } from './services/print/packages';
import { GeneratedShiftSheet, generateShiftSheet } from './services/generator';
import { recordPrint, buildTaskSnapshot } from './services/printHistory';
import { buildResidentCareSummaryModel } from './services/print/specializedDocs';

export function App() {
  const [dbState, setDbState] = useState<AppDatabaseState>(db.getState());
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    const welcomeSetting = db.getState().settings.welcomeHero?.showWelcomePage || 'on_first_launch';
    if (welcomeSetting === 'always') return 'welcome';
    if (welcomeSetting === 'on_first_launch' && !localStorage.getItem('tasksheet_welcome_dismissed')) {
      return 'welcome';
    }
    return 'dashboard';
  });
  const [currentDate, setCurrentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Active sub-views
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialType, setAddModalInitialType] = useState<AddEntityType | undefined>(undefined);
  const [addModalContextResidentId, setAddModalContextResidentId] = useState<string | undefined>(undefined);
  const [addModalContextShiftId, setAddModalContextShiftId] = useState<string | undefined>(undefined);

  const [quickCareResident, setQuickCareResident] = useState<Resident | null>(null);
  const [printShiftSheet, setPrintShiftSheet] = useState<GeneratedShiftSheet | null>(null);
  const [printPreviewModel, setPrintPreviewModel] = useState<PrintDocumentModel | null>(null);
  const [specializedPrintDoc, setSpecializedPrintDoc] = useState<SpecializedPrintDoc | null>(null);
  const [packagePrintModel, setPackagePrintModel] = useState<PrintPackageModel | null>(null);

  // Subscribe to local database changes
  useEffect(() => {
    const unsubscribe = db.subscribe((newState) => {
      setDbState({ ...newState });
    });
    return unsubscribe;
  }, []);

  // Quick navigation handlers
  const handleOpenShift = (shiftId: string) => {
    setActiveShiftId(shiftId);
    setCurrentTab('shifts');
  };

  const handleOpenResident = (residentId: string) => {
    setActiveResidentId(residentId);
    setCurrentTab('residents');
  };

  const handleOpenQuickAdd = (type?: AddEntityType, resId?: string, sId?: string) => {
    setAddModalInitialType(type);
    setAddModalContextResidentId(resId || (activeResidentId && currentTab === 'residents' ? activeResidentId : undefined));
    setAddModalContextShiftId(sId || (activeShiftId && currentTab === 'shifts' ? activeShiftId : undefined));
    setIsAddModalOpen(true);
  };

  const handleTabChange = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (tab !== 'shifts') setActiveShiftId(null);
    if (tab !== 'residents') setActiveResidentId(null);
  };

  const currentActiveShift = activeShiftId ? dbState.shifts.find(s => s.id === activeShiftId) : undefined;

  // Full-screen print preview replaces the entire app layout
  if (printPreviewModel) {
    return (
      <PrintPreviewPage
        model={printPreviewModel}
        onBack={() => setPrintPreviewModel(null)}
      />
    );
  }

  if (specializedPrintDoc) {
    return (
      <PrintPreviewPage
        specializedDoc={specializedPrintDoc}
        onBack={() => setSpecializedPrintDoc(null)}
      />
    );
  }

  if (packagePrintModel) {
    return (
      <PrintPreviewPage
        packageModel={packagePrintModel}
        onBack={() => setPackagePrintModel(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F6F8FA] text-[#0F172A]">
      {/* 1. PERMANENT SIDEBAR */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'welcome') setIsPresentationMode(false);
          handleTabChange(tab);
        }}
        onOpenQuickAdd={() => handleOpenQuickAdd()}
        binderUpdateRequired={dbState.binderState.status === 'update_required'}
      />

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Sticky Navbar */}
        <Navbar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          selectedShift={currentActiveShift}
          facility={dbState.facility}
          pendingChangesCount={dbState.binderState.pendingChangesCount}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* DASHBOARD */}
          {currentTab === 'dashboard' && (
            <DashboardView
              currentDate={currentDate}
              onOpenShift={handleOpenShift}
              onOpenQuickAdd={(type) => handleOpenQuickAdd(type)}
              onPrintShift={setPrintShiftSheet}
              onNavigateToBinder={() => handleTabChange('fyi-binder')}
              onNavigateToResidents={() => handleTabChange('residents')}
            />
          )}

          {/* SHIFTS (List or Active Workspace) */}
          {currentTab === 'shifts' && (
            activeShiftId ? (
              <ShiftWorkspaceView
                shiftId={activeShiftId}
                currentDate={currentDate}
                onBack={() => setActiveShiftId(null)}
                onPrint={setPrintShiftSheet}
                onPrintSpecializedDoc={setSpecializedPrintDoc}
                onOpenAddCareTask={(resId) => handleOpenQuickAdd('care_task', resId, activeShiftId)}
                onOpenAddUnitTask={() => handleOpenQuickAdd('unit_task', undefined, activeShiftId)}
                onOpenAddFYI={() => handleOpenQuickAdd('fyi', undefined, activeShiftId)}
                onOpenResidentProfile={handleOpenResident}
              />
            ) : (
              <ShiftsView
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onOpenShift={handleOpenShift}
                onPrintShift={setPrintShiftSheet}
                onOpenAddShift={() => handleTabChange('settings')}
                onOpenQuickAdd={(type) => handleOpenQuickAdd(type)}
              />
            )
          )}

          {/* RESIDENTS (Directory or Resident Profile) */}
          {currentTab === 'residents' && (
            activeResidentId ? (
              <ResidentProfileView
                residentId={activeResidentId}
                onBack={() => setActiveResidentId(null)}
                onOpenAddCareTask={(resId) => handleOpenQuickAdd('care_task', resId)}
                onOpenAddFYI={(resId) => handleOpenQuickAdd('fyi', resId)}
                onOpenAddWound={(resId) => handleOpenQuickAdd('wound', resId)}
                onOpenQuickCareSetup={setQuickCareResident}
                onPrintCareSummary={(resId) => {
                  const model = buildResidentCareSummaryModel(resId, currentDate);
                  if (model) setSpecializedPrintDoc({ type: 'resident_care', model });
                }}
              />
            ) : (
              <ResidentsView
                onOpenResidentProfile={handleOpenResident}
                onOpenAddResident={() => handleOpenQuickAdd('resident')}
                onOpenQuickCareSetup={setQuickCareResident}
                onOpenAddCareTask={(resId) => handleOpenQuickAdd('care_task', resId)}
                onOpenAddFYI={(resId) => handleOpenQuickAdd('fyi', resId)}
                onOpenAddWound={(resId) => handleOpenQuickAdd('wound', resId)}
              />
            )
          )}

          {/* FYI BINDER */}
          {currentTab === 'fyi-binder' && (
            <FYIBinderView
              onOpenAddFYI={() => handleOpenQuickAdd('fyi')}
            />
          )}

          {/* PRINT CENTER */}
          {currentTab === 'reports-print' && (
            <ReportsPrintView
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onPrintShiftSheet={setPrintShiftSheet}
              onPrintSpecializedDoc={setSpecializedPrintDoc}
              onPrintPackage={setPackagePrintModel}
            />
          )}

          {/* SETTINGS */}
          {currentTab === 'settings' && (
            <SettingsView
              onNavigateToWelcome={(presentationMode = false) => {
                handleTabChange('welcome');
                setIsPresentationMode(presentationMode);
              }}
            />
          )}

          {/* WELCOME & OVERVIEW HERO */}
          {currentTab === 'welcome' && (
            <WelcomeHeroView
              presentationMode={isPresentationMode}
              onStartWork={() => {
                localStorage.setItem('tasksheet_welcome_dismissed', 'true');
                setIsPresentationMode(false);
                setCurrentTab('dashboard');
              }}
              onNavigateToSetup={() => {
                localStorage.setItem('tasksheet_welcome_dismissed', 'true');
                setIsPresentationMode(false);
                setCurrentTab('settings');
              }}
              onNavigateToPrint={() => {
                localStorage.setItem('tasksheet_welcome_dismissed', 'true');
                setIsPresentationMode(false);
                setCurrentTab('reports-print');
              }}
            />
          )}
        </main>
      </div>

      {/* 3. GLOBAL CONTEXT-AWARE MODALS */}
      {/* Global + Add Modal */}
      <GlobalAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddModalInitialType(undefined);
        }}
        initialType={addModalInitialType}
        contextResidentId={addModalContextResidentId}
        contextShiftId={addModalContextShiftId}
      />

      {/* Quick Care Setup Modal */}
      {quickCareResident && (
        <QuickCareSetupModal
          isOpen={true}
          onClose={() => setQuickCareResident(null)}
          resident={quickCareResident}
        />
      )}

      {/* Direct Print Preview & Sheet Modal */}
      {printShiftSheet && (
        <PrintModal
          isOpen={true}
          onClose={() => setPrintShiftSheet(null)}
          shiftSheet={printShiftSheet}
          onOpenFullPreview={(model) => {
            const structuredItems: any[] = [];
            printShiftSheet.residentAssignments.forEach(a => {
              a.tasks.forEach(t => {
                structuredItems.push({
                  id: t.id,
                  roomNumber: a.resident.roomNumber,
                  residentName: `${a.resident.firstName} ${a.resident.lastName}`,
                  title: t.title,
                  time: t.time,
                  category: t.category,
                  instructions: t.instructions,
                  priority: t.priority,
                  updatedAt: (t as any).updatedAt || (t as any).createdAt || '',
                });
              });
              a.wounds.forEach(w => {
                structuredItems.push({
                  id: w.id,
                  roomNumber: a.resident.roomNumber,
                  residentName: `${a.resident.firstName} ${a.resident.lastName}`,
                  title: `Wound Care: ${w.siteLocation}`,
                  time: '1000',
                  category: 'Wound Care',
                  instructions: w.instructions,
                  updatedAt: (w as any).updatedAt || (w as any).createdAt || '',
                });
              });
            });

            recordPrint({
              shiftId: printShiftSheet.shift.id,
              shiftCode: printShiftSheet.shift.shortCode || '',
              shiftName: printShiftSheet.shift.name,
              date: printShiftSheet.date,
              profile: model.profile,
              totalItems: model.summary.totalResidentTasks + model.summary.totalUnitTasks,
              items: structuredItems,
            });

            setPrintPreviewModel(model);
            setPrintShiftSheet(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
