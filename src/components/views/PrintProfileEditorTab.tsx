import React, { useState } from 'react';
import { 
  Printer, 
  Check, 
  Sliders, 
  Type, 
  Eye, 
  Layers, 
  RotateCcw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { db } from '../../db';
import { PrintProfileConfig, QuickVitalsColumnConfig, PrintDensity } from '../../types';
import { DEFAULT_HCA_PRINT_PROFILE, DEFAULT_LPN_PRINT_PROFILE, DEFAULT_VITALS_COLUMNS } from '../../data/defaultData';

interface PrintProfileEditorTabProps {
  onShowFeedback: (type: 'success' | 'error', text: string) => void;
}

export const PrintProfileEditorTab: React.FC<PrintProfileEditorTabProps> = ({ onShowFeedback }) => {
  const state = db.getState();
  const savedProfiles = state.settings.printProfiles || [DEFAULT_HCA_PRINT_PROFILE, DEFAULT_LPN_PRINT_PROFILE];

  const [selectedProfileType, setSelectedProfileType] = useState<'simple_checklist' | 'clinical_worksheet'>('clinical_worksheet');
  
  // Find current profile or fallback to defaults
  const currentProfile = savedProfiles.find(p => p.profileType === selectedProfileType) || 
    (selectedProfileType === 'simple_checklist' ? DEFAULT_HCA_PRINT_PROFILE : DEFAULT_LPN_PRINT_PROFILE);

  const [config, setConfig] = useState<PrintProfileConfig>({ ...currentProfile });
  const [newColLabel, setNewColLabel] = useState('');
  const [newColShort, setNewColShort] = useState('');

  // Switch profile tab
  const handleSelectType = (type: 'simple_checklist' | 'clinical_worksheet') => {
    setSelectedProfileType(type);
    const p = savedProfiles.find(item => item.profileType === type) || 
      (type === 'simple_checklist' ? DEFAULT_HCA_PRINT_PROFILE : DEFAULT_LPN_PRINT_PROFILE);
    setConfig({ ...p });
  };

  // Toggle vitals column
  const handleToggleColumn = (colId: string) => {
    const updatedCols = (config.quickVitalsColumns || []).map(col => 
      col.id === colId ? { ...col, enabled: !col.enabled } : col
    );
    setConfig({ ...config, quickVitalsColumns: updatedCols });
  };

  // Add custom vitals column
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;
    const newCol: QuickVitalsColumnConfig = {
      id: `col_custom_${Date.now()}`,
      label: newColLabel.trim(),
      shortLabel: newColShort.trim() || newColLabel.trim().slice(0, 4),
      width: '45pt',
      enabled: true,
      isSystem: false,
    };
    setConfig({
      ...config,
      quickVitalsColumns: [...(config.quickVitalsColumns || []), newCol],
    });
    setNewColLabel('');
    setNewColShort('');
    onShowFeedback('success', `Added custom column "${newCol.label}".`);
  };

  // Delete custom column
  const handleDeleteColumn = (colId: string) => {
    const filtered = (config.quickVitalsColumns || []).filter(c => c.id !== colId);
    setConfig({ ...config, quickVitalsColumns: filtered });
  };

  // Save profile to database
  const handleSave = () => {
    const otherProfiles = savedProfiles.filter(p => p.profileType !== config.profileType);
    const updatedProfiles = [...otherProfiles, config];
    
    db.updateFacilitySettings({
      printProfiles: updatedProfiles,
    });
    onShowFeedback('success', `Saved ${config.name} configuration.`);
  };

  // Reset to default
  const handleReset = () => {
    if (confirm(`Reset ${config.name} to Alberta standard defaults?`)) {
      const defaultProf = config.profileType === 'simple_checklist' 
        ? DEFAULT_HCA_PRINT_PROFILE 
        : DEFAULT_LPN_PRINT_PROFILE;
      setConfig({ ...defaultProf });
      
      const otherProfiles = savedProfiles.filter(p => p.profileType !== config.profileType);
      db.updateFacilitySettings({
        printProfiles: [...otherProfiles, defaultProf],
      });
      onShowFeedback('success', `Reset ${config.name} to standard defaults.`);
    }
  };

  const isClinical = config.profileType === 'clinical_worksheet';

  return (
    <div className="space-y-6">
      {/* ── PROFILE SELECTOR TABS ── */}
      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => handleSelectType('clinical_worksheet')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              selectedProfileType === 'clinical_worksheet'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-teal-600" />
            <span>LPN Clinical Worksheet (Landscape)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectType('simple_checklist')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
              selectedProfileType === 'simple_checklist'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>HCA Simple Checklist (Portrait)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-rose-700 font-semibold flex items-center space-x-1 rounded-lg hover:bg-slate-200 transition-colors"
          title="Reset to Alberta standard factory default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT: CONFIGURATION CONTROLS (7 COLS) ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Typography & Density */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>Print Density & Typography</span>
            </h3>

            {/* Density Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Print Density
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'standard', 'spacious'] as PrintDensity[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setConfig({ ...config, density: mode })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      config.density === mode
                        ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold capitalize text-slate-900">{mode}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {mode === 'compact' && 'Tighter rows · max tasks/page'}
                      {mode === 'standard' && 'Balanced Alberta default'}
                      {mode === 'spacious' && 'Larger boxes · night & gloves'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accessibility: Large Print */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Large Print Mode</span>
                <p className="text-[11px] text-slate-500">
                  Boost base text to 12pt high-contrast for low-vision working environments
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.largePrint}
                onChange={e => setConfig({ ...config, largePrint: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
            </div>
          </div>

          {/* 2. Quick Vitals Columns (LPN only) */}
          {isClinical && (
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Quick Vitals Table Columns
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Customize the columns printed on the LPN Quick Vitals reconciliation grid
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(config.quickVitalsColumns || []).map(col => (
                  <label
                    key={col.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      col.enabled ? 'border-slate-300 bg-slate-50 font-bold text-slate-900' : 'border-slate-200 text-slate-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={col.enabled}
                        onChange={() => handleToggleColumn(col.id)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{col.label} ({col.shortLabel})</span>
                    </div>
                    {!col.isSystem && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleDeleteColumn(col.id); }}
                        className="text-slate-400 hover:text-rose-600"
                        title="Delete custom column"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </label>
                ))}
              </div>

              {/* Add custom column input */}
              <form onSubmit={handleAddColumn} className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Custom Column Name (e.g. O2 LPM)"
                  value={newColLabel}
                  onChange={e => setNewColLabel(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Abbr (e.g. LPM)"
                  value={newColShort}
                  onChange={e => setNewColShort(e.target.value)}
                  className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              {/* Blank rows slider */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Minimum Blank Vitals Rows</span>
                  <p className="text-[11px] text-slate-500">Number of writing rows generated for write-ins</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="4"
                    max="16"
                    step="1"
                    value={config.quickVitalsRowsCount || 8}
                    onChange={e => setConfig({ ...config, quickVitalsRowsCount: Number(e.target.value) })}
                    className="w-24 accent-teal-600"
                  />
                  <span className="font-mono text-xs font-bold text-slate-800 w-6 text-right">
                    {config.quickVitalsRowsCount || 8}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Section Visibility & Handoff */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Sections & Writing Clearance
            </h3>

            <div className="space-y-2.5">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showStartUnitTasks}
                  onChange={e => setConfig({ ...config, showStartUnitTasks: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Include <strong>Start of Shift</strong> Unit Routines</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showDuringUnitTasks}
                  onChange={e => setConfig({ ...config, showDuringUnitTasks: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Include <strong>During Shift</strong> Unit Routines</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showEndUnitTasks}
                  onChange={e => setConfig({ ...config, showEndUnitTasks: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Include <strong>End of Shift</strong> Unit Routines</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showImportantFYIs}
                  onChange={e => setConfig({ ...config, showImportantFYIs: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Include <strong>Important Information</strong> (Standing FYIs)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showHandoffLines}
                  onChange={e => setConfig({ ...config, showHandoffLines: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Include <strong>Handoff / Supervisor Notes</strong> lines</span>
              </label>
            </div>

            {/* Handoff Lines Count */}
            {config.showHandoffLines && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Handoff Writing Lines</span>
                  <p className="text-[11px] text-slate-500">Blank ruled lines at sheet bottom</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={config.handoffLinesCount}
                    onChange={e => setConfig({ ...config, handoffLinesCount: Number(e.target.value) })}
                    className="w-24 accent-teal-600"
                  />
                  <span className="font-mono text-xs font-bold text-slate-800 w-6 text-right">
                    {config.handoffLinesCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SAVE BUTTON */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save {config.name}</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT: LIVE PAPER SIMULATION PREVIEW (5 COLS) ── */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Live Paper Simulation</span>
            </span>
            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
              {isClinical ? 'Landscape 11" x 8.5"' : 'Portrait 8.5" x 11"'}
            </span>
          </div>

          <div className="bg-slate-200 p-4 rounded-xl border border-slate-300 shadow-inner flex justify-center">
            {/* Scaled paper mockup */}
            <div 
              className="bg-white shadow-xl rounded-sm p-4 text-[10px] text-slate-800 select-none overflow-hidden"
              style={{
                width: isClinical ? '380px' : '300px',
                minHeight: isClinical ? '270px' : '390px',
                fontFamily: 'Arial, sans-serif',
                fontSize: config.largePrint ? '11px' : config.density === 'compact' ? '9px' : '10px',
                lineHeight: config.density === 'spacious' ? 1.5 : 1.3,
              }}
            >
              {/* Mock Header */}
              <div className="border-b-2 border-slate-900 pb-1 mb-2 flex justify-between items-start">
                <div>
                  <span className="font-black text-xs block">TASKSHEET</span>
                  <span className="text-[9px] text-slate-500 uppercase">{config.name}</span>
                </div>
                <div className="text-right text-[8px] text-slate-400">
                  <span>{state.facility.siteName}</span>
                </div>
              </div>

              {/* Mock Shift Banner */}
              <div className="bg-slate-100 p-1 rounded text-[9px] font-bold mb-2 flex justify-between">
                <span>{isClinical ? 'LP1 — LPN Day' : 'D1 — HCA Day'}</span>
                <span>0700–1900</span>
              </div>

              {/* Mock Sections */}
              {config.showStartUnitTasks && (
                <div className="mb-2">
                  <div className="font-black text-[9px] uppercase border-b border-slate-900 mb-1">Start of Shift</div>
                  <div className="flex items-center space-x-1 text-[9px] text-slate-700">
                    <span className="w-2.5 h-2.5 border border-slate-600 rounded-sm inline-block" />
                    <span>0700 · Shift Handover & Narcotics Count</span>
                  </div>
                </div>
              )}

              {/* Mock Resident Care */}
              <div className="mb-2">
                <div className="font-black text-[9px] uppercase border-b border-slate-900 mb-1">Resident Care</div>
                <div className="space-y-1">
                  <div className="font-bold text-[9px]">ROOM 254 — Mary Smith</div>
                  <div className="flex items-center space-x-1 pl-1 text-[9px]">
                    <span className="w-2.5 h-2.5 border border-slate-600 rounded-sm inline-block" />
                    <span>0800 · Morning Care & Vitals</span>
                  </div>
                </div>
              </div>

              {/* Mock Quick Vitals (Clinical only) */}
              {isClinical && (
                <div className="mb-2">
                  <div className="font-black text-[9px] uppercase border-b border-slate-900 mb-1">Quick Vitals</div>
                  <div className="border border-slate-400 rounded-sm overflow-hidden text-[8px]">
                    <div className="bg-slate-100 font-bold flex divide-x divide-slate-300">
                      <span className="p-0.5 w-8 text-center">Room</span>
                      {(config.quickVitalsColumns || []).filter(c => c.enabled).slice(0, 5).map(c => (
                        <span key={c.id} className="p-0.5 flex-1 text-center">{c.shortLabel}</span>
                      ))}
                    </div>
                    <div className="flex divide-x divide-slate-300 border-t border-slate-300">
                      <span className="p-0.5 w-8 text-center font-bold">254</span>
                      {(config.quickVitalsColumns || []).filter(c => c.enabled).slice(0, 5).map(c => (
                        <span key={c.id} className="p-0.5 flex-1" />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mock Handoff Lines */}
              {config.showHandoffLines && (
                <div>
                  <div className="font-black text-[9px] uppercase border-b border-slate-900 mb-1">Handoff / Notes</div>
                  {Array.from({ length: Math.min(3, config.handoffLinesCount) }).map((_, i) => (
                    <div key={i} className="border-b border-slate-300 h-3" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
