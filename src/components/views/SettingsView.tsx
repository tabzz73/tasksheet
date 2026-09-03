import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Clock, 
  Users, 
  BookOpen, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Check, 
  AlertTriangle,
  Info,
  Shield,
  Layers,
  Search,
  Filter,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  PackagePlus
} from 'lucide-react';
import { db } from '../../db';
import { Facility, FacilitySettings, FacilityBrandingSettings, Role, Shift, CatalogTaskTemplate, UnitTaskTemplate, FacilityContactExtension } from '../../types';

import { ShiftFormModal } from '../modals/ShiftFormModal';
import { PrintProfileEditorTab } from './PrintProfileEditorTab';
import { QuickAddPresetsTab } from './QuickAddPresetsTab';
import { AttentionRulesTab } from './AttentionRulesTab';
import { EmergencyCodesTab } from './EmergencyCodesTab';
import { CareTimingSettingsTab } from './CareTimingSettingsTab';
import { AppInformationTab } from './AppInformationTab';
import { DeveloperInformationTab } from './DeveloperInformationTab';
import { WoundSupplyCatalogTab } from './WoundSupplyCatalogTab';
import { RoomSetupTab } from './RoomSetupTab';
import { ServiceCoverageSettingsTab } from './ServiceCoverageSettingsTab';
import { DomainConflictError, ValidationResult } from '../../services/validation';
import { ConflictNotice } from '../common/ConflictNotice';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';
import { ViewHeader } from '../common/ViewHeader';
import { getTodayLocalDateString } from '../../services/recurrence';
import { ChevronDown, Code2, Printer, Sparkles, ShieldAlert } from 'lucide-react';
import { formatShiftHeader } from '../../services/print';
import {
  CANADIAN_CITIES_BY_PROVINCE,
  CANADIAN_PROVINCES,
  formatCanadianPhone,
  formatCanadianPostalCode,
  formatContactNumber,
  isValidCanadianPhone,
} from '../../services/facilityFormatting';

interface SettingsViewProps {
  onNavigateToWelcome?: (presentationMode?: boolean) => void;
  navigationResetToken?: number;
}

type SettingsTab = 'facility' | 'rooms' | 'care_timings' | 'service_coverage' | 'print_profiles' | 'quick_presets' | 'attention_rules' | 'emergency_codes' | 'preferences' | 'shifts' | 'catalog' | 'wound_supplies' | 'demo' | 'backup' | 'app_info' | 'developer_info';

const SETTINGS_NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    id: SettingsTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}> = [
  {
    label: 'Facility',
    items: [
      { id: 'facility', label: 'Facility Setup', description: 'Identity, address and print branding', icon: Building2 },
      { id: 'rooms', label: 'Rooms & Occupancy', description: 'Room labels, beds and availability', icon: Building2 },
      { id: 'shifts', label: 'Roles & Shifts', description: 'Operational schedules and coverage', icon: Users },
      { id: 'care_timings', label: 'Care Timing Presets', description: 'Medication and meal schedules', icon: Clock },
      { id: 'service_coverage', label: 'Service Coverage', description: 'Funded and additional service classifications', icon: Shield },
      { id: 'preferences', label: 'Preferences', description: 'Clock, display and startup behavior', icon: Clock },
    ],
  },
  {
    label: 'TaskSheet Workflow',
    items: [
      { id: 'print_profiles', label: 'Print Profiles', description: 'HCA and LPN layout preferences', icon: Printer },
      { id: 'quick_presets', label: 'Quick Add Presets', description: 'Common resident-care shortcuts', icon: Sparkles },
      { id: 'attention_rules', label: 'Attention & Safety', description: 'Visibility and alert rules', icon: ShieldAlert },
      { id: 'emergency_codes', label: 'Emergency Codes', description: 'Code catalog and Code of the Month', icon: ShieldAlert },
      { id: 'catalog', label: 'Care Task Catalog', description: 'Standardized task definitions', icon: BookOpen },
      { id: 'wound_supplies', label: 'Wound Supply Catalog', description: 'Products, sizes and facility stock', icon: PackagePlus },
    ],
  },
  {
    label: 'Data & Support',
    items: [
      { id: 'backup', label: 'Backup & Restore', description: 'Protect and recover local data', icon: Database },
      { id: 'demo', label: 'Demo Workspace', description: 'Optional fictional practice data', icon: Layers },
    ],
  },
  {
    label: 'Application',
    items: [
      { id: 'app_info', label: 'App Information', description: 'Version, welcome and presentation', icon: Info },
      { id: 'developer_info', label: 'Developer Information', description: 'Publisher and technical identity', icon: Code2 },
    ],
  },
];

function prepareFacilityForEditing(facility: Facility): Facility {
  return {
    ...facility,
    postalCode: formatCanadianPostalCode(facility.postalCode),
    mainPhone: formatCanadianPhone(facility.mainPhone),
    unitPhone: formatCanadianPhone(facility.unitPhone),
    fax: formatCanadianPhone(facility.fax),
  };
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateToWelcome, navigationResetToken = 0 }) => {
  const state = db.getState();
  const [activeTab, setActiveTab] = useState<SettingsTab | null>(null);
  const [expandedNavGroup, setExpandedNavGroup] = useState('Facility');
  
  // Facility Form State
  const [facility, setFacility] = useState<Facility>(() => prepareFacilityForEditing(state.facility));
  const [branding, setBranding] = useState<FacilityBrandingSettings>(
    state.settings.branding || {
      headerStyle: 'standard',
      shiftHeaderFormat: 'short_code_only',
      confidentialityNotice: 'CONFIDENTIAL HEALTHCARE RECORD — FOR AUTHORIZED FACILITY USE ONLY. DISPOSE VIA SECURE SHREDDING AT END OF SHIFT.',
      showConfidentialityNotice: true,
      showSupervisorSignatureBlock: true,
      watermarkStyle: 'none',
    }
  );
  const [facilitySaved, setFacilitySaved] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<FacilitySettings>(state.settings);

  // Shift Manager State
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftActiveFilter, setShiftActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [shiftModalState, setShiftModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'duplicate';
    shift?: Shift | null;
  }>({
    isOpen: false,
    mode: 'add',
    shift: null
  });

  // Catalog Manager State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogRoleFilter, setCatalogRoleFilter] = useState<'ALL' | 'HCA' | 'LPN'>('ALL');
  const [catalogCatFilter, setCatalogCatFilter] = useState<string>('ALL');
  const [catalogAuthFilter, setCatalogAuthFilter] = useState<'ALL' | 'AUTH' | 'NON_AUTH'>('ALL');
  const [catalogActiveFilter, setCatalogActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Messages
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingsConflict, setSettingsConflict] = useState<ValidationResult | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);

  useEffect(() => {
    setActiveTab(null);
    setExpandedNavGroup('Facility');
    setShiftModalState(prev => ({ ...prev, isOpen: false }));
    setFeedbackMessage(null);
  }, [navigationResetToken]);

  const handleSelectSettingsTab = (tab: SettingsTab) => {
    const ownerGroup = SETTINGS_NAV_GROUPS.find(group => group.items.some(item => item.id === tab));
    if (ownerGroup) setExpandedNavGroup(ownerGroup.label);
    setActiveTab(tab);
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleAddExtension = () => {
    const newExt: FacilityContactExtension = {
      id: `ext_${Date.now()}`,
      label: '',
      number: '',
      enabled: true,
    };
    const current = facility.additionalExtensions || [];
    setFacility({ ...facility, additionalExtensions: [...current, newExt] });
  };

  const handleUpdateExtension = (id: string, updates: Partial<FacilityContactExtension>) => {
    const current = facility.additionalExtensions || [];
    setFacility({
      ...facility,
      additionalExtensions: current.map(ext => ext.id === id ? { ...ext, ...updates } : ext),
    });
  };

  const handleDeleteExtension = (id: string) => {
    const current = facility.additionalExtensions || [];
    setFacility({
      ...facility,
      additionalExtensions: current.filter(ext => ext.id !== id),
    });
  };

  const handleLoadPresetExtensions = () => {
    const presets: FacilityContactExtension[] = [
      { id: `ext_pharm_${Date.now()}`, label: 'Pharmacy', number: 'ext 4021', enabled: true },
      { id: `ext_phys_${Date.now() + 1}`, label: 'Physio', number: 'ext 3110', enabled: true },
      { id: `ext_crn_${Date.now() + 2}`, label: 'Charge RN', number: 'ext 2001', enabled: true },
      { id: `ext_doc_${Date.now() + 3}`, label: 'Doctor On-Call', number: '403-555-0155', enabled: true },
      { id: `ext_sec_${Date.now() + 4}`, label: 'Security', number: 'ext 2222', enabled: false },
    ];
    setFacility({ ...facility, additionalExtensions: presets });
    showFeedback('success', 'Loaded standard clinical quick contact extensions.');
  };

  const handleToggleShiftActive = (shift: Shift) => {
    const runDeactivate = () => {
      try {
        db.deactivateShift(shift.id);
        showFeedback('success', `Deactivated shift "${shift.shortCode} — ${shift.name}".`);
      } catch (err: any) {
        showFeedback('error', err.message || 'Failed to toggle shift.');
      }
    };
    try {
      if (shift.isActive !== false) {
        const impact = db.analyzeShiftDeactivation(shift.id);
        if (impact.status === 'WARNING') {
          setConfirmRequest({
            title: `Deactivate ${shift.shortCode}?`,
            message: impact.message,
            confirmLabel: 'Deactivate Anyway',
            tone: 'danger',
            onConfirm: runDeactivate,
          });
          return;
        }
        runDeactivate();
      } else {
        db.reactivateShift(shift.id);
        showFeedback('success', `Reactivated shift "${shift.shortCode} — ${shift.name}".`);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to toggle shift.');
    }
  };

  const handleDeleteShift = (shift: Shift) => {
    setConfirmRequest({
      title: 'Delete Shift?',
      message: `Delete shift "${shift.shortCode} — ${shift.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Shift',
      tone: 'danger',
      onConfirm: () => {
        const res = db.deleteShift(shift.id);
        if (res.success) {
          showFeedback('success', `Shift "${shift.shortCode} — ${shift.name}" deleted.`);
        } else {
          showFeedback('error', res.error || 'Failed to delete shift.');
        }
      },
    });
  };

  const handleMoveShift = (shiftId: string, direction: 'up' | 'down') => {
    const currentOrder = [...state.shifts].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    const index = currentOrder.findIndex(s => s.id === shiftId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;

    db.reorderShifts(currentOrder.map(s => s.id));
  };

  const filteredShifts = [...state.shifts]
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
    .filter(s => {
      if (shiftActiveFilter === 'ACTIVE' && s.isActive === false) return false;
      if (shiftActiveFilter === 'INACTIVE' && s.isActive !== false) return false;
      if (shiftSearch.trim()) {
        const query = shiftSearch.toLowerCase();
        const role = state.roles.find(r => r.id === s.roleId);
        const matchCode = s.shortCode?.toLowerCase().includes(query);
        const matchName = s.name.toLowerCase().includes(query);
        const matchRole = role?.name.toLowerCase().includes(query) || role?.code.toLowerCase().includes(query);
        return matchCode || matchName || matchRole;
      }
      return true;
    });

  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedFacility: Facility = {
      ...facility,
      siteName: facility.siteName.trim(),
      street: facility.street.trim(),
      addressLine2: facility.addressLine2?.trim(),
      city: facility.city.trim(),
      province: facility.province.toUpperCase(),
      postalCode: formatCanadianPostalCode(facility.postalCode),
      mainPhone: formatCanadianPhone(facility.mainPhone),
      unitPhone: formatCanadianPhone(facility.unitPhone),
      fax: formatCanadianPhone(facility.fax),
    };
    if (!isValidCanadianPhone(normalizedFacility.mainPhone)) {
      showFeedback('error', 'Enter a complete 10-digit main phone number.');
      return;
    }
    if (normalizedFacility.unitPhone && !isValidCanadianPhone(normalizedFacility.unitPhone)) {
      showFeedback('error', 'Enter a complete 10-digit unit phone number or leave it blank.');
      return;
    }
    if (normalizedFacility.fax && !isValidCanadianPhone(normalizedFacility.fax)) {
      showFeedback('error', 'Enter a complete 10-digit fax number or leave it blank.');
      return;
    }
    if (!/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(normalizedFacility.postalCode)) {
      showFeedback('error', 'Enter a valid Canadian postal code, for example T6W 2P3.');
      return;
    }
    setFacility(normalizedFacility);
    db.updateFacility(normalizedFacility);
    db.updateFacilitySettings({ branding });
    setFacilitySaved(true);
    showFeedback('success', 'Facility profile & branding updated. All print headers reflect new details.');
    setTimeout(() => setFacilitySaved(false), 3000);
  };

  const citySuggestions = CANADIAN_CITIES_BY_PROVINCE[facility.province] || [];

  const handleSaveSettings = (updates: Partial<FacilitySettings>) => {
    try {
      setSettingsConflict(null);
      db.updateSettings(updates);
      setSettings({ ...settings, ...updates });
      showFeedback('success', 'Preferences updated.');
    } catch (error) {
      if (error instanceof DomainConflictError) setSettingsConflict(error.result);
      else showFeedback('error', error instanceof Error ? error.message : 'TaskSheet could not safely update this setting.');
    }
  };

  const handleExportCatalog = () => {
    const data = db.exportCatalog();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskSheet_Standard_Catalog_${getTodayLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('success', 'Standard catalog exported (0 resident records included).');
  };

  const handleImportCatalog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = db.importCatalog(json);
        showFeedback('success', `Catalog imported: ${result.newCount} new templates, ${result.updatedCount} updated.`);
      } catch (err: any) {
        showFeedback('error', `Failed to import catalog: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetCatalog = () => {
    setConfirmRequest({
      title: 'Reset Care Task Catalog?',
      message: 'Reset catalog to the Alberta Starter Catalog v1.0 standard templates? Custom templates will be preserved.',
      confirmLabel: 'Reset Catalog',
      tone: 'danger',
      onConfirm: () => {
        db.resetCatalog();
        showFeedback('success', 'Standard catalog refreshed to Alberta Starter Catalog v1.0.');
      },
    });
  };

  const handleToggleTemplate = (slug: string) => {
    db.toggleTemplateActive(slug);
    showFeedback('success', 'Template active status updated.');
  };

  const handleExportBackup = () => {
    const json = db.backupDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskSheet_Backup_${getTodayLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('success', 'Full database backup downloaded.');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Clear immediately so re-selecting the same file always re-triggers this handler,
    // regardless of whether the confirmation below is accepted or cancelled.
    e.target.value = '';

    setConfirmRequest({
      title: 'Restore From Backup?',
      message: 'Restore from this backup file? This replaces the entire current facility, residents, tasks, wounds, and FYIs with the contents of the backup file. This cannot be undone.',
      confirmLabel: 'Restore Backup',
      tone: 'danger',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            db.restoreDatabase(event.target?.result as string);
            showFeedback('success', 'Database restored successfully from backup.');
          } catch (err: any) {
            showFeedback('error', `Restore failed: ${err.message}`);
          }
        };
        reader.readAsText(file);
      },
    });
  };

  const handleLoadDemo = () => {
    setConfirmRequest({
      title: 'Load Demo Workspace?',
      message: 'Load the fictional Cedar Grove demo workspace? Manual facility data and records will be preserved. If setup is still blank, Cedar Grove will be used until you clear the demo.',
      confirmLabel: 'Load Demo Workspace',
      onConfirm: () => {
        db.loadDemoData();
        setFacility(prepareFacilityForEditing(db.getState().facility));
        setSettings(db.getState().settings);
        showFeedback('success', 'Demo workspace loaded. Demo records and shifts are visibly identified and can be cleared here.');
      },
    });
  };

  const handleClearDemo = () => {
    if (settings.dataMode === 'demo') {
      setConfirmRequest({
        title: 'Clear Demo & Start Real Setup?',
        message: 'Clear the fictional Cedar Grove facility, demo shifts, residents, tasks, FYIs, and wounds, then begin real facility setup? The built-in task catalog will remain.',
        confirmLabel: 'Clear Demo & Start Setup',
        tone: 'danger',
        onConfirm: () => {
          db.startRealSetup();
          setFacility(prepareFacilityForEditing(db.getState().facility));
          setSettings(db.getState().settings);
          setActiveTab('facility');
          showFeedback('success', 'Demo configuration cleared. Enter your real facility details and create HCA/LPN shifts.');
        },
      });
      return;
    }
    setConfirmRequest({
      title: 'Clear Demo Data?',
      message: 'Clear all demo residents, assignments, and test FYIs? Manual facility data, shifts, records, and the standard catalog will remain intact.',
      confirmLabel: 'Clear Demo Data',
      tone: 'danger',
      onConfirm: () => {
        db.clearDemoData();
        showFeedback('success', 'Demo records removed. Manual production records and the standard catalog remain active.');
      },
    });
  };

  // Filtered Catalog Items for Manager
  const filteredCatalog = state.catalogTaskTemplates.filter(t => {
    if (catalogRoleFilter !== 'ALL' && t.roleCode !== catalogRoleFilter && t.roleCode !== 'SHARED') return false;
    if (catalogCatFilter !== 'ALL' && t.categoryId !== catalogCatFilter) return false;
    if (catalogAuthFilter === 'AUTH' && !t.authorizationDependent) return false;
    if (catalogAuthFilter === 'NON_AUTH' && t.authorizationDependent) return false;
    if (catalogActiveFilter === 'ACTIVE' && t.isActive === false) return false;
    if (catalogActiveFilter === 'INACTIVE' && t.isActive !== false) return false;

    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.synonyms?.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <ViewHeader
        kicker="Configure"
        title="Settings"
        subtitle="Facility profile, task catalog, shifts, printing, and data management."
      />

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className={`px-3.5 py-2.5 rounded-control flex items-center gap-2 text-[12px] font-semibold ${
          feedbackMessage.type === 'success' ? 'bg-positive-soft text-positive' : 'bg-danger-soft text-danger'
        }`}>
          {feedbackMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}
      {settingsConflict && <ConflictNotice result={settingsConflict} onAction={() => setSettingsConflict(null)} />}
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />

      {/* LANDING MENU — grouped flat-card lists, per the design reference. Shown until a
          section is selected; navigating away from Settings and back resets here. */}
      {activeTab === null && (
        <div className="space-y-6">
          {SETTINGS_NAV_GROUPS.map(group => (
            <div key={group.label}>
              <h2 className="mb-2.5 font-heading font-extrabold text-[13px] uppercase tracking-[0.04em] text-ink-soft">{group.label}</h2>
              <div className="title-block rounded-surface overflow-hidden">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSettingsTab(item.id)}
                    className="ts-row w-full flex items-center gap-3 px-4.5 py-3.5 text-left border-b border-hairline last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">
                        {item.label}
                        {item.id === 'catalog' && <span className="ml-1 font-normal text-faint">({state.catalogTaskTemplates.length})</span>}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5">{item.description}</div>
                    </div>
                    <span className="text-faint shrink-0">→</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab !== null && (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveTab(null)}
          className="flex items-center gap-1.5 text-[12px] font-bold text-accent-strong hover:text-accent transition-colors"
        >
          ← All Settings
        </button>

        <div className="min-w-0">
          <main className="min-w-0">

      {/* 1. FACILITY PROFILE */}
      {activeTab === 'facility' && (
        <form onSubmit={handleSaveFacility} className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-ink">Facility Profile & Print Header</h3>
            <p className="text-xs text-muted mt-0.5">
              These details are dynamically rendered on all physical shift sheets and worksheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Facility / Site Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={facility.siteName}
                onChange={(e) => setFacility({ ...facility, siteName: e.target.value })}
                required
                autoComplete="organization"
                aria-label="Facility or site name"
                placeholder="e.g. Heritage Valley Care Centre"
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Unit / Wing Name
              </label>
              <input
                type="text"
                value={facility.unitName || ''}
                onChange={(e) => setFacility({ ...facility, unitName: e.target.value })}
                autoComplete="off"
                aria-label="Unit or wing name"
                placeholder="e.g. North Unit — optional, used for the Dashboard greeting"
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Street Address <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={facility.street}
                onChange={(e) => setFacility({ ...facility, street: e.target.value })}
                required
                autoComplete="address-line1"
                aria-label="Street address"
                placeholder="Street number and name"
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={facility.addressLine2 || ''}
                onChange={(e) => setFacility({ ...facility, addressLine2: e.target.value })}
                placeholder="Suite / Wing / Floor"
                autoComplete="address-line2"
                aria-label="Address line 2"
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                City <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={facility.city}
                onChange={(e) => setFacility({ ...facility, city: e.target.value })}
                required
                list="facility-city-suggestions"
                autoComplete="address-level2"
                aria-label="City"
                placeholder="Start typing or choose a suggestion"
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
              <datalist id="facility-city-suggestions">
                {citySuggestions.map(city => <option key={city} value={city} />)}
              </datalist>
              <p className="text-[10px] text-muted mt-1">Suggestions follow the selected province; other municipalities can still be typed.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                  Province <span className="text-danger">*</span>
                </label>
                <select
                  value={facility.province}
                  onChange={(e) => setFacility({ ...facility, province: e.target.value })}
                  required
                  autoComplete="address-level1"
                  aria-label="Province or territory"
                  className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent bg-panel"
                >
                  {!CANADIAN_PROVINCES.some(province => province.code === facility.province) && facility.province && (
                    <option value={facility.province}>{facility.province}</option>
                  )}
                  {CANADIAN_PROVINCES.map(province => (
                    <option key={province.code} value={province.code}>{province.name} ({province.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                  Postal Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={facility.postalCode}
                  onChange={(e) => setFacility({ ...facility, postalCode: formatCanadianPostalCode(e.target.value) })}
                  required
                  autoComplete="postal-code"
                  aria-label="Postal code"
                  placeholder="A1A 1A1"
                  maxLength={7}
                  pattern="[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]"
                  title="Enter a Canadian postal code such as T6W 2P3"
                  className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Main Phone <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                value={facility.mainPhone}
                onChange={(e) => setFacility({ ...facility, mainPhone: formatCanadianPhone(e.target.value) })}
                required
                inputMode="tel"
                autoComplete="tel"
                aria-label="Main phone"
                placeholder="(780) 555-0100"
                maxLength={18}
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
              <p className="text-[10px] text-muted mt-1">Formatting is added automatically as you type.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Nursing / Unit Desk Phone
              </label>
              <input
                type="tel"
                value={facility.unitPhone}
                onChange={(e) => setFacility({ ...facility, unitPhone: formatCanadianPhone(e.target.value) })}
                inputMode="tel"
                autoComplete="tel"
                aria-label="Nursing or unit desk phone"
                placeholder="(780) 555-0112"
                maxLength={18}
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Fax
              </label>
              <input
                type="tel"
                value={facility.fax}
                onChange={(e) => setFacility({ ...facility, fax: formatCanadianPhone(e.target.value) })}
                inputMode="tel"
                aria-label="Fax"
                placeholder="(780) 555-0113"
                maxLength={18}
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* ── ADDITIONAL UNIT EXTENSIONS & QUICK CONTACTS ── */}
          <div className="pt-6 border-t border-hairline-strong space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink">Unit Extensions & Quick Contacts (Print Header)</h4>
                <p className="text-xs text-muted">
                  Add telephone extensions or on-call numbers to print in the header for staff quick reference.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadPresetExtensions}
                  className="px-2.5 py-1.5 border border-hairline-strong hover:bg-panel-sunken rounded-control text-xs font-semibold text-ink-soft transition-colors"
                >
                  Load Common Presets
                </button>
                <button
                  type="button"
                  onClick={handleAddExtension}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Extension</span>
                </button>
              </div>
            </div>

            {(!facility.additionalExtensions || facility.additionalExtensions.length === 0) ? (
              <div className="p-4 bg-panel-sunken border border-hairline-strong rounded-control text-center text-xs text-muted">
                No quick contact extensions configured. Click <strong>Add Extension</strong> or <strong>Load Common Presets</strong>.
              </div>
            ) : (
              <div className="space-y-2">
                {facility.additionalExtensions.map((ext) => (
                  <div key={ext.id} className="flex items-center space-x-3 p-2.5 bg-panel-sunken border border-hairline-strong rounded-control">
                    <label className="flex items-center space-x-2 cursor-pointer shrink-0" title="Include on print header">
                      <input
                        type="checkbox"
                        checked={ext.enabled !== false}
                        onChange={(e) => handleUpdateExtension(ext.id, { enabled: e.target.checked })}
                        className="rounded text-accent focus:ring-accent w-4 h-4"
                      />
                      <span className="text-xs font-medium text-ink-soft">Print</span>
                    </label>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={ext.label}
                        onChange={(e) => handleUpdateExtension(ext.id, { label: e.target.value })}
                        placeholder="Label (e.g. Pharmacy, Physio, Charge RN)"
                        className="px-3 py-1.5 border border-hairline-strong rounded-md text-xs font-semibold focus:ring-2 focus:ring-accent bg-panel"
                      />
                      <input
                        type="text"
                        value={ext.number}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleUpdateExtension(ext.id, {
                            number: /^[a-z]/i.test(value.trim()) ? value : formatContactNumber(value),
                          });
                        }}
                        onBlur={(e) => handleUpdateExtension(ext.id, { number: formatContactNumber(e.target.value) })}
                        placeholder="Extension / Number (e.g. ext 4021, 403-555-0155)"
                        className="px-3 py-1.5 border border-hairline-strong rounded-md text-xs font-medium focus:ring-2 focus:ring-accent bg-panel"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteExtension(ext.id)}
                      className="p-1.5 text-faint hover:text-danger rounded-md transition-colors shrink-0"
                      title="Delete extension"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── BRANDING & COMPLIANCE SECTION ── */}
          <div className="pt-6 border-t border-hairline-strong space-y-4">
            <div>
              <h4 className="text-sm font-bold text-ink">Header Layout & Document Branding</h4>
              <p className="text-xs text-muted">Configure visual branding and legal compliance headers printed on all working sheets.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                  Header Layout Style
                </label>
                <select
                  value={branding.headerStyle}
                  onChange={(e) => setBranding({ ...branding, headerStyle: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent bg-panel"
                >
                  <option value="standard">Standard Two-Column Clinical Header</option>
                  <option value="compact">Compact Minimalist Header</option>
                  <option value="centered">Centered Hospital Brand Header</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                  Shift Header Display
                </label>
                <select
                  value={branding.shiftHeaderFormat || 'short_code_only'}
                  onChange={(e) => setBranding({ ...branding, shiftHeaderFormat: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent bg-panel"
                >
                  <option value="short_code_only">Short Code Only (e.g. D1LPN · 0700–1900) — Default</option>
                  <option value="name_only">Full Shift Name & Hours (e.g. D1LPN — LPN Day · 0700–1900)</option>
                  <option value="full_name_and_role">Full Name, Role & Hours (e.g. D1LPN — LPN Day · Licensed Practical Nurse · 0700–1900)</option>
                </select>
                <p className="text-[11px] text-muted mt-1">Controls how the shift is identified on printed TaskSheets. Short Code Only is recommended for the most compact layout.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                  Logo URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... or data:image/png;base64,..."
                  value={branding.logoUrl || ''}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Confidentiality / FOIP Disposal Notice (Printed in Footer)
              </label>
              <textarea
                rows={2}
                value={branding.confidentialityNotice}
                onChange={(e) => setBranding({ ...branding, confidentialityNotice: e.target.value })}
                className="w-full px-3.5 py-2 border border-hairline-strong rounded-control text-xs font-mono focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center space-x-2 text-xs text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.showConfidentialityNotice}
                  onChange={(e) => setBranding({ ...branding, showConfidentialityNotice: e.target.checked })}
                  className="rounded text-accent focus:ring-accent"
                />
                <span>Print Confidentiality Notice on all documents</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.showSupervisorSignatureBlock}
                  onChange={(e) => setBranding({ ...branding, showSupervisorSignatureBlock: e.target.checked })}
                  className="rounded text-accent focus:ring-accent"
                />
                <span>Include Supervisor Signature Block on Handoffs</span>
              </label>
            </div>

            {/* ── LIVE HEADER STYLE PREVIEW BOX ── */}
            <div className="mt-4 p-4 bg-panel-sunken border border-hairline-strong rounded-control">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Live Header Layout Preview ({branding.headerStyle === 'compact' ? 'Compact Minimalist' : branding.headerStyle === 'centered' ? 'Centered Hospital Brand' : 'Standard Two-Column'})</span>
                <span className="text-[10px] text-accent-strong bg-accent-soft px-2 py-0.5 rounded border border-hairline-strong">Real-time Print Simulation</span>
              </div>
              <div className="bg-panel p-4 border border-hairline-strong rounded shadow-xs">
                {branding.headerStyle === 'compact' ? (
                  <div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="h-5 max-w-[80px] object-contain" />}
                        <strong className="text-ink font-black text-sm">TASKSHEET</strong>
                        <span className="font-bold text-ink-soft">· {facility.siteName}</span>
                        <span className="text-muted text-[11px]">(CLINICAL SHIFT WORKSHEET)</span>
                      </div>
                      <div className="text-muted text-[11px] text-right">
                        {facility.street} · {facility.city} · Main: <strong>{facility.mainPhone}</strong>
                      </div>
                    </div>
                    <div className="mt-2 p-1.5 bg-panel-sunken rounded flex justify-between items-center text-xs text-ink-soft">
                      <div>
                        <strong className="text-ink font-bold">
                          {formatShiftHeader({
                            shiftShortCode: 'D1LPN',
                            shiftName: 'D1LPN — LPN Day',
                            roleName: 'Licensed Practical Nurse',
                            shiftTime: '0700–1900'
                          }, branding.shiftHeaderFormat || 'short_code_only')}
                        </strong>
                        {facility.additionalExtensions && facility.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
                          <span className="text-muted ml-2 text-[10px]">
                            | Quick Contacts: {facility.additionalExtensions.filter(e => e.enabled !== false).map(e => `${e.label}: ${e.number}`).join(' · ')}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-ink">Tuesday, August 25, 2026</div>
                    </div>
                  </div>
                ) : branding.headerStyle === 'centered' ? (
                  <div className="text-center">
                    {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain mx-auto mb-1" />}
                    <div className="font-black text-ink text-sm tracking-wide uppercase">{facility.siteName}</div>
                    <div className="text-muted text-xs mt-0.5">
                      {facility.street} · {facility.city}, {facility.province} {facility.postalCode} · Main: <strong>{facility.mainPhone}</strong> · Unit: <strong>{facility.unitPhone}</strong> · Fax: <strong>{facility.fax}</strong>
                    </div>
                    {facility.additionalExtensions && facility.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
                      <div className="text-muted text-[11px] mt-1">
                        <strong className="text-ink">Quick Contacts: </strong>
                        {facility.additionalExtensions.filter(e => e.enabled !== false).map(e => `${e.label}: ${e.number}`).join(' · ')}
                      </div>
                    )}
                    <div className="mt-2 text-ink font-black text-base uppercase tracking-wide">
                      TASKSHEET — <span className="text-xs font-bold text-ink-soft">CLINICAL SHIFT WORKSHEET</span>
                    </div>
                    <div className="mt-2 p-1.5 bg-panel-sunken rounded flex justify-between items-center text-xs text-ink-soft">
                      <div>
                        <strong className="text-ink font-bold">
                          {formatShiftHeader({
                            shiftShortCode: 'D1LPN',
                            shiftName: 'D1LPN — LPN Day',
                            roleName: 'Licensed Practical Nurse',
                            shiftTime: '0700–1900'
                          }, branding.shiftHeaderFormat || 'short_code_only')}
                        </strong>
                      </div>
                      <div className="font-semibold text-ink">Tuesday, August 25, 2026</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="h-9 max-w-[100px] object-contain" />}
                        <div>
                          <h4 className="text-base font-black text-ink uppercase tracking-tight">TASKSHEET</h4>
                          <div className="text-xs font-bold text-muted uppercase tracking-wider">CLINICAL SHIFT WORKSHEET</div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-ink-soft space-y-0.5">
                        <div className="font-bold text-ink text-sm">{facility.siteName}</div>
                        <div>{facility.street} · {facility.city}, {facility.province} {facility.postalCode}</div>
                        <div>Main: <strong>{facility.mainPhone}</strong> · Unit: <strong>{facility.unitPhone}</strong> · Fax: <strong>{facility.fax}</strong></div>
                        {facility.additionalExtensions && facility.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
                          <div className="text-[11px] text-muted">
                            <strong className="text-ink">Quick Contacts: </strong>
                            {facility.additionalExtensions.filter(e => e.enabled !== false).map(e => `${e.label}: ${e.number}`).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 p-1.5 bg-panel-sunken rounded flex justify-between items-center text-xs text-ink-soft">
                      <div>
                        <strong className="text-ink font-bold">
                          {formatShiftHeader({
                            shiftShortCode: 'D1LPN',
                            shiftName: 'D1LPN — LPN Day',
                            roleName: 'Licensed Practical Nurse',
                            shiftTime: '0700–1900'
                          }, branding.shiftHeaderFormat || 'short_code_only')}
                        </strong>
                      </div>
                      <div className="font-semibold text-ink">Tuesday, August 25, 2026</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-hairline-strong">
            <button
              type="submit"
              className="px-6 py-2.5 bg-accent hover:bg-accent-strong text-white rounded-control text-sm font-semibold shadow-elevated transition-colors"
            >
              {facilitySaved ? 'Saved!' : 'Save Facility Profile & Branding'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'rooms' && <RoomSetupTab onShowFeedback={showFeedback} />}

      {/* PRINT PROFILES & LAYOUT */}
      {activeTab === 'print_profiles' && (
        <PrintProfileEditorTab onShowFeedback={showFeedback} />
      )}

      {/* QUICK ADD PRESETS */}
      {activeTab === 'quick_presets' && (
        <QuickAddPresetsTab onShowFeedback={showFeedback} />
      )}

      {/* FACILITY MEDICATION & MEAL TIMES */}
      {activeTab === 'care_timings' && (
        <CareTimingSettingsTab onShowFeedback={showFeedback} />
      )}
      {activeTab === 'service_coverage' && <ServiceCoverageSettingsTab onShowFeedback={showFeedback} />}

      {/* TASK ATTENTION RULES */}
      {activeTab === 'attention_rules' && (
        <AttentionRulesTab onShowFeedback={showFeedback} />
      )}

      {activeTab === 'emergency_codes' && (
        <EmergencyCodesTab onShowFeedback={showFeedback} />
      )}

      {activeTab === 'wound_supplies' && (
        <WoundSupplyCatalogTab onShowFeedback={showFeedback} />
      )}

      {/* 2. CARE TASK CATALOG MANAGER */}
      {activeTab === 'catalog' && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-ink">Standard Task Catalog</h3>
              <p className="text-xs text-muted mt-0.5">
                Alberta Starter Catalog v1.0 (AHS / Alberta continuing-care aligned). {state.catalogTaskTemplates.length} total templates.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportCatalog}
                className="px-3 py-1.5 bg-panel-sunken hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Catalog</span>
              </button>

              <label className="px-3 py-1.5 bg-panel-sunken hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Catalog</span>
                <input type="file" accept=".json" onChange={handleImportCatalog} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleResetCatalog}
                className="px-3 py-1.5 bg-accent-soft hover:bg-accent-soft text-accent-strong rounded-control text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Standard</span>
              </button>
            </div>
          </div>

          {/* Catalog Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-panel-sunken rounded-surface border border-hairline-strong text-xs">
            <div>
              <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1">Search Template / Slug</label>
              <div className="relative">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="e.g. MAP, shower, BG check, vitals..."
                  className="w-full pl-8 pr-3 py-1.5 bg-panel border border-hairline-strong rounded-control text-xs"
                />
                <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-2" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1">Role Filter</label>
              <select
                value={catalogRoleFilter}
                onChange={(e) => setCatalogRoleFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-panel border border-hairline-strong rounded-control text-xs font-medium"
              >
                <option value="ALL">All Roles</option>
                <option value="HCA">HCA Tasks</option>
                <option value="LPN">LPN Tasks</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1">Category Domain</label>
              <select
                value={catalogCatFilter}
                onChange={(e) => setCatalogCatFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-panel border border-hairline-strong rounded-control text-xs font-medium"
              >
                <option value="ALL">All Categories ({state.catalogCategories.length})</option>
                {state.catalogCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-soft uppercase mb-1">Authorization</label>
              <select
                value={catalogAuthFilter}
                onChange={(e) => setCatalogAuthFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-panel border border-hairline-strong rounded-control text-xs font-medium"
              >
                <option value="ALL">All Tasks</option>
                <option value="AUTH">Authorization-Dependent</option>
                <option value="NON_AUTH">Standard Supportive Care</option>
              </select>
            </div>
          </div>

          {/* Template Table */}
          <div className="border border-hairline-strong rounded-control overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-panel-sunken border-b border-hairline-strong text-ink-soft font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Task Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Stable Slug</th>
                  <th className="py-2.5 px-3">Attributes</th>
                  <th className="py-2.5 px-3 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline font-medium">
                {filteredCatalog.map(t => {
                  const cat = state.catalogCategories.find(c => c.id === t.categoryId);
                  const isAct = t.isActive !== false;
                  return (
                    <tr key={t.slug} className={`hover:bg-panel-sunken/70 transition-colors ${!isAct ? 'opacity-50 bg-panel-sunken' : ''}`}>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.roleCode === 'HCA' ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-accent-strong'
                        }`}>
                          {t.roleCode}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-ink">{t.title}</span>
                        {t.description && <p className="text-[11px] text-muted">{t.description}</p>}
                      </td>
                      <td className="py-2 px-3 text-ink-soft">
                        {cat?.name || t.categoryId}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted">
                        {t.slug}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1">
                          {t.carePlanDependent && (
                            <span className="px-1.5 py-0.2 text-[10px] bg-accent-soft text-accent-strong border border-hairline-strong rounded">
                              CarePlan
                            </span>
                          )}
                          {t.authorizationDependent && (
                            <span className="px-1.5 py-0.2 text-[10px] bg-warning-soft text-warning border border-warning rounded">
                              Auth-Req
                            </span>
                          )}
                          {t.isStandardTemplate === false && (
                            <span className="px-1.5 py-0.2 text-[10px] bg-accent-soft text-accent-strong border border-hairline-strong rounded">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleTemplate(t.slug)}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition-colors inline-flex items-center space-x-1 ${
                            isAct ? 'bg-panel-sunken text-ink-soft hover:bg-panel-sunken' : 'bg-accent text-white hover:bg-accent-strong'
                          }`}
                        >
                          {isAct ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isAct ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ROLES & SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
            <div>
              <h3 className="text-base font-bold text-ink">Shift Management</h3>
              <p className="text-xs text-muted mt-0.5">
                Configure facility shifts, customizable Short Codes (e.g. D1, LP1, NLPN), working hours, and authoritative roles.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShiftModalState({ isOpen: true, mode: 'add', shift: null })}
              className="px-3.5 py-2 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold shadow flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Shift</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-faint" />
              <input
                type="text"
                value={shiftSearch}
                onChange={(e) => setShiftSearch(e.target.value)}
                placeholder="Search by short code (e.g. LP1, D1), shift name, or role..."
                className="w-full pl-9 pr-3.5 py-2 bg-panel-sunken border border-hairline-strong rounded-control text-xs font-medium text-ink focus:bg-panel focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <select
                value={shiftActiveFilter}
                onChange={(e) => setShiftActiveFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-xs font-medium text-ink-soft"
              >
                <option value="ALL">All Shifts ({state.shifts.length})</option>
                <option value="ACTIVE">Active Shifts ({state.shifts.filter(s => s.isActive !== false).length})</option>
                <option value="INACTIVE">Deactivated Shifts ({state.shifts.filter(s => s.isActive === false).length})</option>
              </select>
            </div>
          </div>

          {/* Shifts List / Cards */}
          <div className="space-y-3">
            {filteredShifts.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">
                No shifts match your search criteria. Click "+ Add Shift" above to create one.
              </div>
            ) : (
              filteredShifts.map((s, idx) => {
                const r = state.roles.find(role => role.id === s.roleId);
                const isAct = s.isActive !== false;
                const residentTasksCount = state.residentTasks.filter(t => t.shiftId === s.id && t.isActive !== false).length;
                const unitTasksCount = state.unitTasks.filter(u => u.shiftId === s.id && u.isActive !== false).length;

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-surface border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isAct 
                        ? 'bg-panel border-hairline-strong hover:border-hairline-strong shadow-xs' 
                        : 'bg-panel-sunken/70 border-hairline-strong opacity-60'
                    }`}
                  >
                    <div className="flex items-start sm:items-center space-x-3.5">
                      {/* Prominent Short Code Badge */}
                      <div className={`px-3 py-2 rounded-control font-mono font-black text-sm tracking-wider text-center shrink-0 ${
                        isAct ? 'bg-ink text-white' : 'bg-hairline-strong text-ink-soft'
                      }`}>
                        {s.shortCode || '—'}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-bold text-sm ${isAct ? 'text-ink' : 'text-ink-soft line-through'}`}>
                            {s.name}
                          </h4>
                          <span className="px-2 py-0.5 bg-accent-soft text-accent-strong rounded font-semibold text-xs">
                            {r ? r.name : 'Unknown Role'}
                          </span>
                          {!isAct && (
                            <span className="px-2 py-0.5 bg-warning-soft text-warning rounded font-bold text-[10px] uppercase">
                              Deactivated
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center text-xs text-muted gap-x-3 gap-y-1 mt-1">
                          <span><strong>Hours:</strong> <span className="font-mono text-ink-soft font-semibold">{s.startTime}–{s.endTime}</span></span>
                          <span>·</span>
                          <span><strong>Tasks:</strong> {residentTasksCount} Care Tasks, {unitTasksCount} Unit Routines</span>
                          {s.description && (
                            <>
                              <span>·</span>
                              <span className="italic text-faint">{s.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1.5 self-end md:self-auto">
                      {/* Reorder Buttons */}
                      <div className="flex items-center space-x-0.5 mr-2">
                        <button
                          type="button"
                          onClick={() => handleMoveShift(s.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-faint hover:text-ink-soft hover:bg-panel-sunken disabled:opacity-30"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveShift(s.id, 'down')}
                          disabled={idx === filteredShifts.length - 1}
                          className="p-1 rounded text-faint hover:text-ink-soft hover:bg-panel-sunken disabled:opacity-30"
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShiftModalState({ isOpen: true, mode: 'edit', shift: s })}
                        className="px-2.5 py-1.5 bg-panel-sunken hover:bg-panel-sunken text-ink-soft rounded text-xs font-semibold flex items-center space-x-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShiftModalState({ isOpen: true, mode: 'duplicate', shift: s })}
                        className="px-2.5 py-1.5 bg-panel-sunken hover:bg-panel-sunken text-ink-soft rounded text-xs font-semibold flex items-center space-x-1"
                      >
                        <span>Duplicate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleShiftActive(s)}
                        className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 ${
                          isAct 
                            ? 'bg-warning-soft hover:bg-warning-soft text-warning' 
                            : 'bg-positive-soft hover:bg-positive-soft text-positive'
                        }`}
                      >
                        {isAct ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isAct ? 'Deactivate' : 'Reactivate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteShift(s)}
                        className="p-1.5 text-faint hover:text-danger rounded"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Shift Form Modal */}
          {shiftModalState.isOpen && (
            <ShiftFormModal
              isOpen={shiftModalState.isOpen}
              onClose={() => setShiftModalState(prev => ({ ...prev, isOpen: false }))}
              mode={shiftModalState.mode}
              initialShift={shiftModalState.shift}
              onSuccess={(shift) => {
                showFeedback('success', `Shift "${shift.shortCode} — ${shift.name}" saved successfully.`);
              }}
            />
          )}
        </div>
      )}

      {/* 4. CLOCK & PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-ink">System Preferences</h3>
            <p className="text-xs text-muted mt-0.5">Display formats and local environment preferences.</p>
          </div>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Time Format
              </label>
              <select
                value={settings.timeFormat}
                onChange={(e) => handleSaveSettings({ timeFormat: e.target.value as any })}
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm"
              >
                <option value="24h">24-Hour Military (0700, 1900) — Standard</option>
                <option value="12h">12-Hour AM/PM (7:00 AM, 7:00 PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Facility Timezone
              </label>
              <input
                type="text"
                value={settings.timezone}
                disabled
                className="w-full px-3.5 py-2.5 bg-panel-sunken border border-hairline-strong rounded-control text-sm text-ink-soft"
              />
            </div>

            <div>
              <label htmlFor="operational-week-start" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Operational Week Starts On
              </label>
              <select
                id="operational-week-start"
                value={settings.operationalWeekStartsOn ?? 1}
                onChange={(event) => handleSaveSettings({ operationalWeekStartsOn: Number(event.target.value) })}
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm bg-panel"
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
                <option value={6}>Saturday</option>
              </select>
              <p className="mt-1 text-[11px] text-muted">Controls weekly wound and operational report date ranges.</p>
            </div>

            <div>
              <label htmlFor="bathing-capacity" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Bathing Capacity Per Shift / Day
              </label>
              <input
                id="bathing-capacity"
                type="number"
                min={1}
                max={20}
                value={settings.bathingCapacityPerShiftLine ?? 2}
                onChange={(event) => handleSaveSettings({ bathingCapacityPerShiftLine: Math.max(1, Number(event.target.value) || 1) })}
                className="w-full px-3.5 py-2.5 border border-hairline-strong rounded-control text-sm"
              />
              <p className="mt-1 text-[11px] text-muted">Used by weekly bathing capacity and open-slot reports. Default: 2.</p>
            </div>

            <fieldset>
              <legend className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Bathing-Capable Shifts
              </legend>
              <div className="rounded-control border border-hairline-strong divide-y divide-hairline bg-panel-sunken">
                {state.shifts.filter(shift => shift.isActive !== false).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)).map(shift => {
                  const defaultIds = state.shifts.filter(item => item.isActive !== false && state.roles.find(role => role.id === item.roleId)?.code === 'HCA').map(item => item.id);
                  const selectedIds = settings.bathingShiftIds ?? defaultIds;
                  const selected = selectedIds.includes(shift.id);
                  return <label key={shift.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-panel">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => handleSaveSettings({ bathingShiftIds: event.target.checked ? [...selectedIds, shift.id] : selectedIds.filter(id => id !== shift.id) })}
                    />
                    <span className="font-mono font-black text-xs">{shift.shortCode}</span>
                    <span className="text-xs text-ink-soft">{shift.name}</span>
                  </label>;
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted">Each selected line appears in the weekly grid, including days with zero scheduled bathing assignments.</p>
            </fieldset>

          </div>
        </div>
      )}

      {activeTab === 'app_info' && (
        <AppInformationTab
          settings={settings}
          onUpdateSettings={handleSaveSettings}
          onNavigateToWelcome={onNavigateToWelcome}
        />
      )}

      {activeTab === 'developer_info' && (
        <DeveloperInformationTab />
      )}

      {/* 5. DEMO DATA MANAGER */}
      {activeTab === 'demo' && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-ink">Demo Data Manager</h3>
            <p className="text-xs text-muted mt-0.5">
              Demo content is optional and is never included in a fresh production setup. Load it here only when you want a fictional practice workspace.
            </p>
          </div>

          <div className="p-4 bg-accent-soft border border-hairline-strong rounded-surface space-y-3">
            <h4 className="text-sm font-bold text-accent-strong flex items-center space-x-2">
              <Shield className="w-4 h-4 text-accent-strong" />
              <span>Catalog Isolation Guarantee</span>
            </h4>
            <p className="text-xs text-accent-strong">
              Demo shifts and operational records are isolated by source tag (`source: 'demo'`). Loading or clearing them never overwrites manual production entries. The Alberta Standard Task Catalog remains available in both real and demo setups.
            </p>
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="px-4 py-2 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold transition-colors"
              >
                Load Demo Workspace
              </button>
              <button
                type="button"
                onClick={handleClearDemo}
                className="px-4 py-2 bg-danger hover:bg-danger text-white rounded-control text-xs font-bold transition-colors"
              >
                {settings.dataMode === 'demo' ? 'Clear Demo & Start Real Setup' : 'Clear Demo Data Only'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-ink">JSON Database Backup & Restore</h3>
            <p className="text-xs text-muted mt-0.5">
              Export full local database state or restore from previously saved JSON snapshot.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-hairline-strong rounded-surface bg-panel-sunken space-y-3">
              <h4 className="font-bold text-sm text-ink flex items-center space-x-2">
                <Download className="w-4 h-4 text-accent-strong" />
                <span>Export Full Backup</span>
              </h4>
              <p className="text-xs text-ink-soft">
                Downloads complete JSON file including facility profile, residents, care tasks, unit routines, FYIs, wounds, and catalog.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 bg-ink hover:bg-ink text-white rounded-control text-xs font-bold transition-colors"
              >
                Download Backup JSON
              </button>
            </div>

            <div className="p-5 border border-hairline-strong rounded-surface bg-panel-sunken space-y-3">
              <h4 className="font-bold text-sm text-ink flex items-center space-x-2">
                <Upload className="w-4 h-4 text-accent-strong" />
                <span>Restore From Backup</span>
              </h4>
              <p className="text-xs text-ink-soft">
                Upload a verified TaskSheet JSON backup file to restore application state.
              </p>
              <label className="px-4 py-2 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold cursor-pointer inline-flex items-center space-x-1.5 transition-colors">
                <span>Select Backup File...</span>
                <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
          </main>
        </div>
      </div>
      )}
    </div>
  );
};
