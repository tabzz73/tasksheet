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
  const [includeFyiReference, setIncludeFyiReference] = useState(true);

  const model = isHca
    ? buildHcaDailyPackage(dateStr, {
        includeBathingGrid: includeSpecializedGrid,
        includeFyiReference,
      })
    : buildLpnClinicalPackage(dateStr, {
        includeWoundSchedule: includeSpecializedGrid,
        includeFyiReference,
      });

  const handleGenerate = () => {
    onOpenPackagePreview(model);
    onClose();
  };

  const packageTitle = isHca ? 'HCA Daily Operational Package' : 'LPN Clinical Shift Package';
  const packageDesc = isHca
    ? 'Bundles all daytime/evening HCA TaskSheets, the weekly Bathing Schedule Grid, and active floor FYIs.'
    : 'Bundles all LPN/RN Clinical Worksheets with Quick Vitals, the Wound Treatment Schedule, and clinical alerts.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={packageTitle}
      subtitle={`${model.formattedDate} · Complete Shift Bundle`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">{packageDesc}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The entire package will be generated into a continuous, collated print stream with automatic page breaks.
            </p>
          </div>
        </div>

        {/* ── PACKAGE INCLUSIONS ── */}
        {model.exceptions.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950" role="alert">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-xs font-black">Exceptions / Needs Review</p>
                <p className="mt-0.5 text-[11px] text-amber-900">
                  {model.exceptions.length} timed task{model.exceptions.length === 1 ? ' was' : 's were'} outside the assigned shift window and will not be included in this package.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Package Inclusions ({model.items.length} documents)
          </label>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
            {model.items.map(item => (
              <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                    {item.docType === 'shift_document' && <Layers className="w-4 h-4 text-slate-900" />}
                    {item.docType === 'bathing_grid' && <Clock className="w-4 h-4 text-teal-700" />}
                    {item.docType === 'wound_schedule' && <Bandage className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.isLandscape ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                        {item.isLandscape ? 'Landscape' : 'Portrait'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-slate-700">~{item.estimatedPages} page{item.estimatedPages !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ATTACHMENT TOGGLES ── */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
            Optional Attachments
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeSpecializedGrid}
                onChange={e => setIncludeSpecializedGrid(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="font-bold text-slate-800">
                  {isHca ? 'Include Bathing Schedule Grid' : 'Include Wound Treatment Schedule'}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isHca ? 'Weekly room matrix for hygiene coordination' : 'Active wound dressing orders and site staging'}
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeFyiReference}
                onChange={e => setIncludeFyiReference(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="font-bold text-slate-800">Include Active FYIs</span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Embed relevant standing precautions into each shift section
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* ── FOOTER ESTIMATE & CTA ── */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Estimated Total: <strong className="text-slate-900 font-black text-sm">~{model.estimatedTotalPages} pages</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="px-5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Preview & Print Package</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
