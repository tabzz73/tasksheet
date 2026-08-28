import React, { useRef } from 'react';

export type PrintOrientation = 'portrait' | 'landscape';

interface RepeatingPrintFooterProps {
  pageName: string;
  orientation: PrintOrientation;
  coverage: string;
  generatedAt?: string;
}

const cssContent = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/[\r\n]+/g, ' ');

export const formatPrintTimestamp = (iso: string): string => new Date(iso).toLocaleString('en-CA', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export const formatPrintDate = (iso: string): string => new Date(iso).toLocaleDateString('en-CA', {
  month: 'short', day: 'numeric', year: 'numeric',
});

export const sanitizePrintPageName = (value: string): string => {
  const safe = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '');
  return `tasksheet-${safe || 'document'}`;
};

export const printPageStyle = (pageName: string): React.CSSProperties => ({
  page: sanitizePrintPageName(pageName),
} as React.CSSProperties);

/**
 * Shared physical-page document control. Chromium repeats these named @page
 * margin boxes on every page belonging to the associated document.
 */
export const RepeatingPrintFooter: React.FC<RepeatingPrintFooterProps> = ({
  pageName,
  orientation,
  coverage,
  generatedAt,
}) => {
  const fallbackGeneratedAt = useRef(new Date().toISOString());
  const safePageName = sanitizePrintPageName(pageName);
  const coverageLabel = cssContent(`Coverage: ${coverage}`);
  const generatedLabel = cssContent(`Generated: ${formatPrintTimestamp(generatedAt || fallbackGeneratedAt.current)}`);

  return <style data-print-footer={safePageName}>{`
    @media print {
      @page ${safePageName} {
        size: letter ${orientation};
        margin: 5mm 5mm 10mm 5mm;
        @bottom-left {
          content: "${coverageLabel}";
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          font-weight: 700;
          color: #475569;
          vertical-align: top;
          padding-top: 0.5mm;
        }
        @bottom-center {
          content: "${generatedLabel}";
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          color: #475569;
          vertical-align: top;
          padding-top: 0.5mm;
        }
        @bottom-right {
          content: counter(page) " / " counter(pages);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          font-weight: 700;
          color: #475569;
          vertical-align: top;
          padding-top: 0.5mm;
        }
      }
    }
  `}</style>;
};
