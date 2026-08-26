import React, { useState } from 'react';
import { Printer, CheckCircle2, ExternalLink, FileText, Users, AlertTriangle, ClipboardList } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PrintService, PrintDocumentModel } from '../../services/print';
import { GeneratedShiftSheet } from '../../services/generator';
import { PrintProfile } from '../../types';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftSheet: GeneratedShiftSheet;
  onOpenFullPreview: (model: PrintDocumentModel) => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  shiftSheet,
  onOpenFullPreview,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<PrintProfile>('role_default');

  const model = PrintService.createDocumentModel(shiftSheet, selectedStyle);
  const { header, summary, profile } = model;

  const roleDefault = shiftSheet.role.defaultPrintProfile;
  const roleDefaultLabel = roleDefault === 'clinical_worksheet' ? 'Clinical Worksheet' : 'Simple Checklist';

  const styleOptions: { value: PrintProfile; label: string; desc: string }[] = [
    {
      value: 'role_default',
      label: 'Role Default',
      desc: roleDefaultLabel,
    },
    {
      value: 'simple_checklist',
      label: 'Simple Checklist',
      desc: 'Compact task-and-instruction layout.',
    },
    {
      value: 'clinical_worksheet',
      label: 'Clinical Worksheet',
      desc: 'More writing space for results, observations and follow-up.',
    },
  ];

  const handlePrint = () => {
    onOpenFullPreview(model);
  };

  // Short date for modal header
  const shortDate = (() => {
    try {
      const [y, m, d] = shiftSheet.date.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch {
      return shiftSheet.date;
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print — ${header.shiftName}`}
      subtitle={`${shortDate} · ${header.shiftTime}`}
      maxWidth="lg"
    >
      <div className="space-y-5">

        {/* ── PRINT STYLE ── */}
        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Print Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {styleOptions.map(opt => {
              const isSelected = selectedStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStyle(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
                      {opt.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-teal-600" />}
                  </div>
                  <p className={`text-[10px] leading-snug ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DOCUMENT SUMMARY ── */}
        {shiftSheet.exceptions.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black text-amber-950">Exceptions / Needs Review</h3>
                <p className="mt-1 text-xs font-semibold text-amber-900">
                  {shiftSheet.exceptions.length} timed task{shiftSheet.exceptions.length === 1 ? ' is' : 's are'} scheduled outside this shift and {shiftSheet.exceptions.length === 1 ? 'was' : 'were'} not included.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {shiftSheet.exceptions.map(exception => (
                    <li key={`${exception.taskType}-${exception.taskId}`} className="text-[11px] leading-relaxed text-amber-900">
                      <span className="font-bold">
                        {exception.roomNumber ? `Room ${exception.roomNumber} — ` : 'Unit task — '}{exception.title}
                      </span>
                      {' — '}{exception.time} — assigned to {exception.shiftCode} ({exception.shiftStart}–{exception.shiftEnd})
                      {exception.reason === 'invalid_time' && <span className="font-semibold"> — invalid time format</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-amber-200 pt-2 text-[10px] text-amber-800">
                  The generated sheet is protected. Correct the task time or assigned shift in Task Setup.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Document Summary</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">

            <div className="flex items-center space-x-2">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-700">
                <strong className="text-slate-900">{summary.totalResidentTasks}</strong> Resident Care Tasks
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <ClipboardList className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-700">
                <strong className="text-slate-900">{summary.totalUnitTasks}</strong> Unit Tasks
              </span>
            </div>

            {summary.importantFyiCount > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-slate-700">
                  <strong className="text-slate-900">{summary.importantFyiCount}</strong> Important FYIs
                </span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-700">
                ~<strong className="text-slate-900">{summary.estimatedPages}</strong> page{summary.estimatedPages !== 1 ? 's' : ''} estimated
                <span className="text-slate-400 ml-1">({profile === 'clinical_worksheet' ? 'Landscape' : 'Portrait'})</span>
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-3 pt-2.5 border-t border-slate-200">
            ☐ All checkboxes remain blank for paper use — no digital completion is stored.
          </p>
        </div>

        {/* ── OPEN FULL PREVIEW ── */}
        <button
          type="button"
          onClick={() => onOpenFullPreview(model)}
          className="w-full flex items-center justify-center space-x-2 py-2.5 border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50 rounded-xl text-sm font-semibold text-slate-600 hover:text-teal-700 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Full Preview</span>
        </button>

        {/* ── ACTIONS ── */}
        <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print TaskSheet</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
