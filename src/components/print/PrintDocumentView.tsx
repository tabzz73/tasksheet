import React from 'react';
import { PrintDocumentModel } from '../../services/print';
import { UniversalTableDocument } from './UniversalTableDocument';

interface PrintDocumentViewProps {
  document: PrintDocumentModel;
}

/**
 * PrintDocumentView — Renders the Universal Compact Table TaskSheet.
 * Standardized across both HCA and LPN with role-intelligent column allocation.
 */
export const PrintDocumentView: React.FC<PrintDocumentViewProps> = ({ document }) => {
  return <UniversalTableDocument model={document} />;
};
