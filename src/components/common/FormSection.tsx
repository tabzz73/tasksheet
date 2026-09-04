import React from 'react';

interface FormSectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

/** Restrained section grouping for modal forms — a label-style heading plus
 *  an optional one-line hint, no border/background of its own. Sections
 *  stack with `space-y-4` in the parent; this component only owns the
 *  heading-to-content spacing within one group. */
export const FormSection: React.FC<FormSectionProps> = ({ title, hint, children }) => (
  <div className="space-y-2">
    <div>
      <h4 className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">{title}</h4>
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);
