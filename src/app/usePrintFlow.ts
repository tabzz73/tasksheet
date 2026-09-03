import { useState } from 'react';
import { GeneratedShiftSheet } from '../services/generator';
import { PrintDocumentModel } from '../services/print';
import { PrintPackageModel } from '../services/print/packages';
import { SpecializedPrintDoc } from '../components/views/PrintPreviewPage';
import { recordPrint } from '../services/printHistory';

export function usePrintFlow() {
  const [printShiftSheet, setPrintShiftSheet] = useState<GeneratedShiftSheet | null>(null);
  const [printPreviewModel, setPrintPreviewModel] = useState<PrintDocumentModel | null>(null);
  const [specializedPrintDoc, setSpecializedPrintDoc] = useState<SpecializedPrintDoc | null>(null);
  const [packagePrintModel, setPackagePrintModel] = useState<PrintPackageModel | null>(null);

  const openFullPreviewFromShiftSheet = (shiftSheet: GeneratedShiftSheet, model: PrintDocumentModel) => {
    const structuredItems: any[] = [];
    shiftSheet.residentAssignments.forEach(a => {
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
          time: w.time,
          category: 'Wound Care',
          instructions: w.instructions,
          updatedAt: (w as any).updatedAt || (w as any).createdAt || '',
        });
      });
    });

    recordPrint({
      shiftId: shiftSheet.shift.id,
      shiftCode: shiftSheet.shift.shortCode || '',
      shiftName: shiftSheet.shift.name,
      date: shiftSheet.date,
      profile: model.profile,
      totalItems: model.summary.totalResidentTasks + model.summary.totalUnitTasks,
      items: structuredItems,
    });

    setPrintPreviewModel(model);
    setPrintShiftSheet(null);
  };

  return {
    printShiftSheet,
    setPrintShiftSheet,
    printPreviewModel,
    setPrintPreviewModel,
    specializedPrintDoc,
    setSpecializedPrintDoc,
    packagePrintModel,
    setPackagePrintModel,
    openFullPreviewFromShiftSheet,
  };
}
