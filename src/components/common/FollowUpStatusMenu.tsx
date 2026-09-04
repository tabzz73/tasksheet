import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { ResidentTaskFollowUpStatus } from '../../types';

interface FollowUpStatusMenuProps {
  onSetStatus: (status: ResidentTaskFollowUpStatus) => void;
  ariaLabel: string;
}

/** Compact "what happened with this follow-up" menu — the one place status
 *  transitions (Done / Carry Forward / Needs Review / No Longer Needed)
 *  happen, shared by the Dashboard Resident Follow-up row and anywhere else
 *  that needs the same quick action. Never auto-decides a clinical next
 *  step; it only records what staff explicitly chose. */
export const FollowUpStatusMenu: React.FC<FollowUpStatusMenuProps> = ({ onSetStatus, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const choose = (status: ResidentTaskFollowUpStatus) => {
    setIsOpen(false);
    onSetStatus(status);
  };

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-control text-faint hover:text-ink hover:bg-panel-sunken transition-colors"
      >
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={ariaLabel}
          className="absolute right-0 mt-1 w-48 z-40 rounded-control border border-hairline-strong bg-panel shadow-elevated py-1 text-xs"
        >
          <button type="button" role="menuitem" onClick={() => choose('done')} className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-positive-soft text-positive">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-semibold">Mark Done</span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose('carry_forward')} className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-panel-sunken text-ink-soft">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-semibold">Carry Forward</span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose('needs_review')} className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-warning-soft text-warning">
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-semibold">Needs Review</span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose('no_longer_needed')} className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-panel-sunken text-muted">
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-semibold">No Longer Needed</span>
          </button>
        </div>
      )}
    </div>
  );
};
