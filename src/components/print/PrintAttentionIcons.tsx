import React from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardPen,
  Clock3,
  Eye,
  ShieldAlert,
  Utensils,
  Users,
  Wrench,
} from 'lucide-react';

type PrintIcon = React.ComponentType<{ size?: number | string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

const ICON_DETAILS: Record<string, { label: string; Icon: PrintIcon; color: string; background: string; border: string }> = {
  HA: { label: 'High Alert', Icon: AlertTriangle, color: '#991b1b', background: '#fff1f2', border: '#be123c' },
  TC: { label: 'Time-Critical', Icon: Clock3, color: '#92400e', background: '#fffbeb', border: '#d97706' },
  BM: { label: 'Before Meal', Icon: Utensils, color: '#115e59', background: '#f0fdfa', border: '#0f766e' },
  AM: { label: 'After Meal', Icon: Utensils, color: '#115e59', background: '#f0fdfa', border: '#0f766e' },
  ML: { label: 'Meal-Linked', Icon: Utensils, color: '#115e59', background: '#f0fdfa', border: '#0f766e' },
  '2P': { label: 'Two-Person Assist', Icon: Users, color: '#581c87', background: '#faf5ff', border: '#7e22ce' },
  FU: { label: 'Follow-Up Required', Icon: ClipboardCheck, color: '#1e40af', background: '#eff6ff', border: '#2563eb' },
  OB: { label: 'Observe / Monitor', Icon: Eye, color: '#155e75', background: '#ecfeff', border: '#0891b2' },
  MON: { label: 'Observe / Monitor', Icon: Eye, color: '#155e75', background: '#ecfeff', border: '#0891b2' },
  IC: { label: 'Precaution', Icon: ShieldAlert, color: '#9a3412', background: '#fff7ed', border: '#ea580c' },
  CR: { label: 'Precaution', Icon: ShieldAlert, color: '#9a3412', background: '#fff7ed', border: '#ea580c' },
  EQ: { label: 'Equipment Required', Icon: Wrench, color: '#334155', background: '#f8fafc', border: '#475569' },
  DOC: { label: 'Record on Form', Icon: ClipboardPen, color: '#3730a3', background: '#eef2ff', border: '#4f46e5' },
};

function normalizeCode(code: string): string {
  return code.replace(/[\[\]]/g, '').trim().toUpperCase();
}

export const PrintAttentionIcon: React.FC<{ code: string; size?: number }> = ({ code, size = 12 }) => {
  const normalized = normalizeCode(code);
  const details = ICON_DETAILS[normalized] || ICON_DETAILS.OB;
  const Icon = details.Icon;
  return (
    <span
      role="img"
      aria-label={details.label}
      title={details.label}
      style={{
        width: `${size + 5}pt`,
        height: `${size + 5}pt`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: details.color,
        background: details.background,
        border: `1.2pt solid ${details.border}`,
        borderRadius: '50%',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <Icon size={`${size}pt`} strokeWidth={2.5} aria-hidden={true} />
    </span>
  );
};

export const PrintAttentionIcons: React.FC<{ codes?: string[]; size?: number }> = ({ codes, size }) => {
  if (!codes?.length) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2.5pt', whiteSpace: 'nowrap' }}>
      {codes.map((code, index) => <PrintAttentionIcon key={`${code}-${index}`} code={code} size={size} />)}
    </span>
  );
};

export const PrintAttentionLegend: React.FC<{ items: Array<{ code: string; label: string }> }> = ({ items }) => (
  <>
    {items.map(item => (
      <span key={item.code} style={{ display: 'inline-flex', alignItems: 'center', gap: '2.5pt' }}>
        <PrintAttentionIcon code={item.code} size={8} />
        <span>{item.label}</span>
      </span>
    ))}
  </>
);
