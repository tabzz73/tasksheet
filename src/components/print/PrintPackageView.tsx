import React from 'react';
import { PrintPackageModel } from '../../services/print/packages';
import { PrintDocumentView } from './PrintDocumentView';
import { BathingScheduleDocument } from './BathingScheduleDocument';
import { WoundScheduleDocument } from './WoundScheduleDocument';
import { FyiBinderPrintDocument } from './FyiBinderPrintDocument';
import { HuddleSheetDocument } from './HuddleSheetDocument';

interface PrintPackageViewProps {
  packageModel: PrintPackageModel;
}

export const PrintPackageView: React.FC<PrintPackageViewProps> = ({ packageModel }) => {
  return (
    <div className="space-y-8 print:space-y-0 select-text">
      {packageModel.items.map((item, index) => {
        const isLandscape = item.isLandscape;
        const paperW = isLandscape ? 1056 : 816;
        const paperH = isLandscape ? 816 : 1056;
        const paperPadding = isLandscape ? '11mm' : '12mm';

        return (
          <div
            key={item.id}
            className="print-package-page"
            style={{
              pageBreakAfter: index < packageModel.items.length - 1 ? 'always' : 'auto',
              breakAfter: index < packageModel.items.length - 1 ? 'page' : 'auto',
            }}
          >
            {/* Screen paper container */}
            <div
              className="bg-white shadow-2xl rounded-sm mx-auto overflow-hidden print:shadow-none print:m-0 print:p-0 print:border-none"
              style={{
                width: `${paperW}px`,
                minHeight: `${paperH}px`,
                padding: paperPadding,
                boxSizing: 'border-box',
              }}
            >
              {/* Document Header Tag on screen */}
              <div className="no-print mb-3 pb-2 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-bold text-slate-600">
                  Document {index + 1} of {packageModel.items.length}: {item.title}
                </span>
                <span className="uppercase tracking-wider font-mono text-[10px]">
                  {isLandscape ? 'Letter Landscape' : 'Letter Portrait'}
                </span>
              </div>

              {/* Render item content */}
              {item.shiftModel && <PrintDocumentView document={item.shiftModel} />}
              {item.bathingModel && <BathingScheduleDocument model={item.bathingModel} />}
              {item.woundModel && <WoundScheduleDocument model={item.woundModel} />}
              {item.fyiBinderModel && <FyiBinderPrintDocument model={item.fyiBinderModel} />}
              {item.huddleModel && <HuddleSheetDocument model={item.huddleModel} />}
            </div>
          </div>
        );
      })}
    </div>
  );
};
