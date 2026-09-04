import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedOptionsToggleProps {
  label?: string;
  children: React.ReactNode;
}

/** Collapsed-by-default disclosure for rarely-changed fields. Extracted from
 *  GlobalAddModal's original "Show Advanced Options" pattern so every modal
 *  gets the same control instead of a bespoke chevron button per form. */
export const AdvancedOptionsToggle: React.FC<AdvancedOptionsToggleProps> = ({ label = 'Advanced options', children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-hairline-strong pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center text-xs font-medium text-muted hover:text-ink"
      >
        <span>{open ? `Hide ${label}` : `Show ${label}`}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
      </button>

      {open && (
        <div className="mt-3 p-3.5 bg-panel-sunken border border-hairline-strong rounded-control space-y-4 text-xs">
          {children}
        </div>
      )}
    </div>
  );
};
