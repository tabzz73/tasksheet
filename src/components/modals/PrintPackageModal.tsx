import React, { useState } from 'react';
import { Package, CheckCircle2, Printer, Layers, Calendar, Info, Bandage, Clock, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PrintPackageModel, buildHcaDailyPackage, buildLpnClinicalPackage } from '../../services/print/packages';

interface PrintPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageType: 'hca' | 'lpn';
  dateStr: string;
  onOpenPackagePreview: (model: PrintPackageModel) => void;
}

export const PrintPackageModal: React.FC<PrintPackageModalProps> = ({
  isOpen,
  onClose,
  packageType,
  dateStr,
  onOpenPackagePreview,
}) => {
  const isHca = packageType === 'hca';

  // Inclusion state
  const [includeSpecializedGrid, setIncludeSpecializedGrid] = useState(true);

  const model = isHca
    ? buildHcaDailyPackage(dateStr, {
        includeBathingGrid: includeSpecializedGrid,
      })
    : buildLpnClinicalPackage(dateStr, {
        includeWoundSchedule: includeSpecializedGrid,
      });

  const handleGenerate = () => {
    onOpenPackagePreview(model);
    onClose();
  };

  const packageTitle = isHca ? 'HCA Daily Operational Package' : 'LPN Clinical Shift Package';
  const packageDesc = isHca
    ? 'Bundles all daytime/evening HCA TaskSheets, the weekly Bathing Schedule Grid, and active floor FYIs.'
    : 'Bundles all LPN/RN Clinical Worksheets with Quick Vitals, the Wound Treatment Schedule, and clinical alerts.';

  const footer = (
    <div className="w-full flex items-center justify-between">
      <div className="text-xs text-muted">
        Estimated Total: <strong className="text-ink font-black text-sm">~{model.estimatedTotalPages} pages</strong>
      </div>
      <div className="flex items-center space-x-2">
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={model.configurationWarnings.length > 0}
          className="px-5 py-2 bg-ink hover:bg-accent-strong disabled:bg-hairline-strong disabled:cursor-not-allowed text-white rounded-control text-xs font-bold shadow flex items-center space-x-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Preview & Print Package</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={packageTitle}
      subtitle={`${model.formattedDate} · Complete Shift Bundle`}
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-5">
        <div className="p-3 bg-panel-sunken border border-hairline-strong rounded-surface text-xs text-ink-soft flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">{packageDesc}</p>
            <p className="text-[11px] text-muted mt-0.5">
              The entire package will be generated into a continuous, collated print stream with automatic page breaks.
            </p>
          </div>
        </div>

        {/* ── PACKAGE INCLUSIONS ── */}
        {model.configurationWarnings.map(warning => (
          <div key={warning} className="rounded-surface border border-danger bg-danger-soft p-3 text-danger" role="alert">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <p className="text-xs font-black">Package Cannot Be Generated Safely</p>
                <p className="mt-0.5 text-[11px] text-danger">{warning}</p>
              </div>
            </div>
          </div>
        ))}

        {model.exceptions.length > 0 && (
          <div className="rounded-surface border border-warning bg-warning-soft p-3 text-warning" role="alert">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-xs font-black">Exceptions / Needs Review</p>
                <p className="mt-0.5 text-[11px] text-warning">
                  {model.exceptions.length} timed task{model.exceptions.length === 1 ? ' was' : 's were'} outside the assigned shift window and will not be included in this package.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-black text-muted uppercase tracking-widest mb-2">
            Package Inclusions ({model.items.length} documents)
          </label>

          <div className="border border-hairline-strong rounded-surface divide-y divide-hairline overflow-hidden bg-panel">
            {model.items.map(item => (
              <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-panel-sunken/60 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-panel-sunken text-ink-soft rounded-control shrink-0">
                    {item.docType === 'shift_document' && <Layers className="w-4 h-4 text-ink" />}
                    {item.docType === 'bathing_grid' && <Clock className="w-4 h-4 text-accent-strong" />}
                    {item.docType === 'wound_schedule' && <Bandage className="w-4 h-4 text-danger" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-ink">{item.title}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.isLandscape ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-accent-strong'}`}>
                        {item.isLandscape ? 'Landscape' : 'Portrait'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-ink-soft">~{item.estimatedPages} page{item.estimatedPages !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ATTACHMENT TOGGLES ── */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-muted uppercase tracking-widest">
            Optional Attachments
          </label>
          <div className="grid grid-cols-1 gap-2">
            <label className="flex items-start space-x-2.5 p-3 rounded-surface border border-hairline-strong hover:bg-panel-sunken cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeSpecializedGrid}
                onChange={e => setIncludeSpecializedGrid(e.target.checked)}
                className="mt-0.5 rounded text-accent focus:ring-accent"
              />
              <div>
                <span className="font-bold text-ink">
                  {isHca ? 'Include Bathing Schedule Grid' : 'Include Wound Treatment Schedule'}
                </span>
                <p className="text-[10px] text-muted mt-0.5">
                  {isHca ? 'Weekly room matrix for hygiene coordination' : 'Active wound dressing orders and site staging'}
                </p>
              </div>
            </label>
          </div>
          <p className="text-[10px] text-muted">
            Relevant resident and unit FYIs are always included automatically within each shift sheet.
          </p>
        </div>

      </div>
    </Modal>
  );
};
