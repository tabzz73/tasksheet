import React from 'react';

interface ViewHeaderProps {
  kicker: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({ kicker, title, subtitle, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-strong">{kicker}</div>
      <h1 className="mt-1.5 mb-1.5 font-heading font-bold text-[22px] tracking-[-0.01em] text-ink">{title}</h1>
      {subtitle && <p className="m-0 text-[13.5px] text-muted max-w-[560px] leading-relaxed">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
