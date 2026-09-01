import React, { useRef } from 'react';

export type PrintOrientation = 'portrait' | 'landscape';

interface RepeatingPrintFooterProps {
  pageName: string;
  orientation: PrintOrientation;
  /** Privacy-safe document family shown on every loose page. */
  documentLabel?: string;
  /** Facility name only; never pass resident identity here. */
  facilityName?: string;
  /** Assignment/report date, range, or generated timestamp. */
  dateLabel?: string;
  /** Optional shift/period identifier printed on a small second line. */
  secondaryLabel?: string;
  /** Legacy fallback while older callers migrate to dateLabel. */
  coverage?: string;
  generatedAt?: string;
}

const cssContent = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/[\r\n]+/g, ' ');

export const formatPrintTimestamp = (iso: string): string => new Date(iso).toLocaleString('en-CA', {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
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
  documentLabel,
  facilityName,
  dateLabel,
  secondaryLabel,
  coverage,
  generatedAt,
}) => {
  const fallbackGeneratedAt = useRef(new Date().toISOString());
  const safePageName = sanitizePrintPageName(pageName);
  const resolvedDocumentLabel = documentLabel || pageName.replace(/[-_]+/g, ' ').replace(/\b\w/g, value => value.toUpperCase());
  const leftLabel = cssContent([facilityName, resolvedDocumentLabel].filter(Boolean).join(' | '));
  const safeSecondary = secondaryLabel ? cssContent(secondaryLabel) : '';
  const centerLabel = cssContent(dateLabel || coverage || `Generated ${formatPrintTimestamp(generatedAt || fallbackGeneratedAt.current)}`);

  return <style data-print-footer={safePageName}>{`
    @media print {
      @page ${safePageName} {
        size: letter ${orientation};
        margin: 5mm 5mm 12mm 5mm;
        @bottom-left {
          content: "${leftLabel}${safeSecondary ? `\\A${safeSecondary}` : ''}";
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          font-weight: 700;
          color: #475569;
          vertical-align: top;
          white-space: pre;
          border-top: 0.5pt solid #94a3b8;
          padding-top: 1mm;
        }
        @bottom-center {
          content: "${centerLabel}";
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          color: #475569;
          vertical-align: top;
          border-top: 0.5pt solid #94a3b8;
          padding-top: 1mm;
        }
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          font-weight: 700;
          color: #475569;
          vertical-align: top;
          border-top: 0.5pt solid #94a3b8;
          padding-top: 1mm;
        }
      }
    }
  `}</style>;
};
