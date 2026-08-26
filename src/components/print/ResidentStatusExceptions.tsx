import React from 'react';
import { GeneratedResidentStatusException } from '../../services/generator';

export const ResidentStatusExceptions: React.FC<{ items?: GeneratedResidentStatusException[] }> = ({ items }) => {
  if (!items?.length) return null;
  return (
    <section
      aria-label="Resident status exceptions"
      style={{
        margin: '6pt 0',
        border: '1pt solid #b45309',
        borderRadius: '3pt',
        background: '#fffbeb',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        breakInside: 'avoid',
      }}
    >
      <div style={{ padding: '2.5pt 6pt', background: '#fef3c7', borderBottom: '0.5pt solid #d97706', color: '#78350f', fontSize: '7.5pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Resident Status — Care Suppressed
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3pt 10pt', padding: '3pt 6pt', fontFamily: 'Arial, sans-serif', fontSize: '7.5pt', color: '#451a03' }}>
        {items.map(item => (
          <span key={item.residentId} style={{ whiteSpace: 'nowrap' }}>
            <strong>Room {item.roomNumber} · {item.residentName}</strong>
            <span> — {item.statusLabel}; tasks not included</span>
          </span>
        ))}
      </div>
    </section>
  );
};
