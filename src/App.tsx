import { db } from './db';
import { Navbar } from './components/layout/Navbar';
import { DemoModeBanner } from './components/layout/DemoModeBanner';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ShiftsView } from './components/views/ShiftsView';
import { ShiftWorkspaceView } from './components/views/ShiftWorkspaceView';
import { ResidentsView } from './components/views/ResidentsView';
import { ResidentProfileView } from './components/views/ResidentProfileView';
import { FYIBinderView } from './components/views/FYIBinderView';
import { ReportsPrintView } from './components/views/ReportsPrintView';
import { SettingsView } from './components/views/SettingsView';
import { WelcomeHeroView } from './components/views/WelcomeHeroView';
import { GlobalAddModal } from './components/modals/GlobalAddModal';
import { QuickCareSetupModal } from './components/modals/QuickCareSetupModal';
import { PrintModal } from './components/modals/PrintModal';
import { PrintPreviewPage } from './components/views/PrintPreviewPage';
import { buildResidentCareSummaryModel } from './services/print/specializedDocs';
import { getDemoState } from './services/demoMode';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { PersistenceStatusBanner } from './components/layout/PersistenceStatusBanner';
import { useDbState } from './app/useDbState';
import { useNavigation } from './app/useNavigation';
import { useModalOrchestration } from './app/useModalOrchestration';
import { usePrintFlow } from './app/usePrintFlow';

export function App() {
  const { dbState, isReady } = useDbState();
  const nav = useNavigation();
  const modal = useModalOrchestration({
    activeResidentId: nav.activeResidentId,
    activeShiftId: nav.activeShiftId,
    currentTab: nav.currentTab,
  });
  const printFlow = usePrintFlow();

  const currentActiveShift = nav.activeShiftId ? dbState.shifts.find(s => s.id === nav.activeShiftId) : undefined;
  const demoState = getDemoState(dbState);

  const handleStartRealSetup = () => {
    modal.requestConfirm({
      title: 'Clear Demo & Start Real Setup?',
      message: 'Clear the fictional Cedar Grove facility, demo shifts, residents, tasks, FYIs, and wounds, then begin real facility setup? The built-in task catalog will remain.',
      confirmLabel: 'Clear Demo & Start Setup',
      tone: 'danger',
      onConfirm: () => {
        db.startRealSetup();
        nav.changeTab('settings');
        nav.setIsPresentationMode(false);
      },
    });
  };

  const handleClearDemoData = () => {
    modal.requestConfirm({
      title: 'Clear Demo Data?',
      message: 'Remove all fictional demo records? Your manually entered facility, shifts, residents, tasks, and settings will be preserved.',
      confirmLabel: 'Clear Demo Data',
      tone: 'danger',
      onConfirm: () => db.clearDemoData(),
    });
  };

  // Initial load from the Electron file store crosses an IPC boundary and
  // isn't instant. The synchronous (browser/dev/test) adapter is always
  // ready immediately, so this never renders outside the packaged app.
  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F6F8FA] text-sm font-semibold text-[#475569]">
        Loading facility data…
      </div>
    );
  }

  // Full-screen print preview replaces the entire app layout
  if (printFlow.printPreviewModel) {
    return (
      <PrintPreviewPage
        model={printFlow.printPreviewModel}
        onBack={() => printFlow.setPrintPreviewModel(null)}
      />
    );
  }

  if (printFlow.specializedPrintDoc) {
    return (
      <PrintPreviewPage
        specializedDoc={printFlow.specializedPrintDoc}
        onBack={() => printFlow.setSpecializedPrintDoc(null)}
      />
    );
  }

  if (printFlow.packagePrintModel) {
    return (
      <PrintPreviewPage
        packageModel={printFlow.packagePrintModel}
        onBack={() => printFlow.setPackagePrintModel(null)}
      />
    );
  }

  const { printShiftSheet } = printFlow;

  return (
    <div className="h-screen overflow-hidden flex bg-app text-ink">
      {/* 1. PERMANENT SIDEBAR (desktop left rail + mobile bottom bar) */}
      <Sidebar
        currentTab={nav.currentTab}
        onTabChange={nav.changeTabFromSidebar}
        onOpenQuickAdd={() => modal.openQuickAdd()}
        binderUpdateRequired={dbState.binderState.status === 'update_required'}
        facilityName={dbState.facility.siteName}
        isDemoMode={demoState.demoConfigurationActive}
      />

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 pb-16 md:pb-0">
        {/* Top Sticky Navbar */}
        <Navbar
          currentDate={nav.currentDate}
          onDateChange={nav.setCurrentDate}
          selectedShift={currentActiveShift}
          facility={dbState.facility}
          pendingChangesCount={dbState.binderState.pendingChangesCount}
        />

        <PersistenceStatusBanner />

        <DemoModeBanner
          state={demoState}
          onStartRealSetup={handleStartRealSetup}
          onClearDemoData={handleClearDemoData}
          onConfigureFacility={() => nav.changeTab('settings')}
        />

        {/* Dynamic Page Views */}
        <main className="relative z-0 isolate flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* DASHBOARD */}
          {nav.currentTab === 'dashboard' && (
            <DashboardView
              currentDate={nav.currentDate}
              onOpenShift={nav.openShift}
              onOpenQuickAdd={(type) => modal.openQuickAdd(type)}
              onPrintShift={printFlow.setPrintShiftSheet}
              onNavigateToBinder={() => nav.changeTab('fyi-binder')}
              onNavigateToResidents={() => nav.changeTab('residents')}
              onOpenResidentProfile={nav.openResident}
              onNavigateToSettings={() => nav.changeTab('settings')}
              onNavigateToBathing={() => nav.changeTab('reports-print')}
            />
          )}

          {/* SHIFTS (List or Active Workspace) */}
          {nav.currentTab === 'shifts' && (
            nav.activeShiftId ? (
              <ShiftWorkspaceView
                shiftId={nav.activeShiftId}
                currentDate={nav.currentDate}
                onBack={nav.closeShift}
                onPrint={printFlow.setPrintShiftSheet}
                onPrintSpecializedDoc={printFlow.setSpecializedPrintDoc}
                onOpenAddCareTask={(resId) => modal.openQuickAdd('care_task', resId, nav.activeShiftId!)}
                onOpenAddUnitTask={() => modal.openQuickAdd('unit_task', undefined, nav.activeShiftId!)}
                onOpenAddFYI={() => modal.openQuickAdd('fyi', undefined, nav.activeShiftId!)}
                onOpenAddWound={() => modal.openQuickAdd('wound', undefined, nav.activeShiftId!)}
                onOpenResidentProfile={nav.openResident}
              />
            ) : (
              <ShiftsView
                currentDate={nav.currentDate}
                onDateChange={nav.setCurrentDate}
                onOpenShift={nav.openShift}
                onPrintShift={printFlow.setPrintShiftSheet}
                onOpenAddShift={() => nav.changeTab('settings')}
                onOpenQuickAdd={(type) => modal.openQuickAdd(type)}
              />
            )
          )}

          {/* RESIDENTS (Directory or Resident Profile) */}
          {nav.currentTab === 'residents' && (
            nav.activeResidentId ? (
              <ResidentProfileView
                residentId={nav.activeResidentId}
                onBack={nav.closeResident}
                onOpenAddCareTask={(resId) => modal.openQuickAdd('care_task', resId)}
                onOpenAddFYI={(resId) => modal.openQuickAdd('fyi', resId)}
                onOpenAddWound={(resId) => modal.openQuickAdd('wound', resId)}
                onOpenQuickCareSetup={modal.setQuickCareResident}
                onPrintCareSummary={(resId) => {
                  const model = buildResidentCareSummaryModel(resId, nav.currentDate);
                  if (model) printFlow.setSpecializedPrintDoc({ type: 'resident_care', model });
                }}
              />
            ) : (
              <ResidentsView
                onOpenResidentProfile={nav.openResident}
                onOpenAddResident={() => modal.openQuickAdd('resident')}
                onOpenQuickCareSetup={modal.setQuickCareResident}
                onOpenAddCareTask={(resId) => modal.openQuickAdd('care_task', resId)}
                onOpenAddFYI={(resId) => modal.openQuickAdd('fyi', resId)}
                onOpenAddWound={(resId) => modal.openQuickAdd('wound', resId)}
              />
            )
          )}

          {/* FYI BINDER */}
          {nav.currentTab === 'fyi-binder' && (
            <FYIBinderView
              onOpenAddFYI={() => modal.openQuickAdd('fyi')}
              navigationResetToken={nav.navigationResetToken}
            />
          )}

          {/* PRINT CENTER */}
          {nav.currentTab === 'reports-print' && (
            <ReportsPrintView
              currentDate={nav.currentDate}
              onDateChange={nav.setCurrentDate}
              onPrintShiftSheet={printFlow.setPrintShiftSheet}
              onPrintSpecializedDoc={printFlow.setSpecializedPrintDoc}
              onPrintPackage={printFlow.openPackagePreview}
              navigationResetToken={nav.navigationResetToken}
            />
          )}

          {/* SETTINGS */}
          {nav.currentTab === 'settings' && (
            <SettingsView
              key={dbState.settings.dataMode || 'operational'}
              navigationResetToken={nav.navigationResetToken}
              onNavigateToWelcome={(presentationMode = false) => {
                nav.changeTab('welcome');
                nav.setIsPresentationMode(presentationMode);
              }}
            />
          )}

          {/* WELCOME & OVERVIEW HERO */}
          {nav.currentTab === 'welcome' && (
            <WelcomeHeroView
              presentationMode={nav.isPresentationMode}
              onStartWork={() => {
                localStorage.setItem('tasksheet_welcome_dismissed', 'true');
                nav.setIsPresentationMode(false);
                nav.changeTab('dashboard');
              }}
              onNavigateToSetup={() => {
                localStorage.setItem('tasksheet_welcome_dismissed', 'true');
                nav.setIsPresentationMode(false);
                nav.changeTab('settings');
              }}
              onNavigateToPrint={() => {
                localStorage.setItem('tasksheet_welcome_dismissed', 'true');
                nav.setIsPresentationMode(false);
                nav.changeTab('reports-print');
              }}
            />
          )}
        </main>
      </div>

      {/* 3. GLOBAL CONTEXT-AWARE MODALS */}
      {/* Global + Add Modal */}
      <GlobalAddModal
        isOpen={modal.addModal.isOpen}
        onClose={modal.closeQuickAdd}
        initialType={modal.addModal.initialType}
        contextResidentId={modal.addModal.contextResidentId}
        contextShiftId={modal.addModal.contextShiftId}
      />

      {/* Quick Care Setup Modal */}
      {modal.quickCareResident && (
        <QuickCareSetupModal
          isOpen={true}
          onClose={() => modal.setQuickCareResident(null)}
          resident={modal.quickCareResident}
        />
      )}

      {/* Direct Print Preview & Sheet Modal */}
      {printShiftSheet && (
        <PrintModal
          isOpen={true}
          onClose={() => printFlow.setPrintShiftSheet(null)}
          shiftSheet={printShiftSheet}
          onOpenFullPreview={(model) => printFlow.openFullPreviewFromShiftSheet(printShiftSheet, model)}
        />
      )}

      <ConfirmDialog request={modal.confirmRequest} onClose={modal.closeConfirm} />
    </div>
  );
}

export default App;
