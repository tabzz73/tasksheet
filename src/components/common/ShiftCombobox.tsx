import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Shift } from '../../types';

function matchesQuery(shift: Shift, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    shift.name.toLowerCase().includes(q) ||
    (shift.shortCode || '').toLowerCase().includes(q)
  );
}

interface ShiftComboboxProps {
  id?: string;
  shifts: Shift[];
  value: string;
  onChange: (shiftId: string) => void;
  /** Full label for one shift option — callers keep control of their own
   *  exact wording (e.g. with or without role/time detail) rather than the
   *  combobox imposing one format on every call site. */
  formatOption: (shift: Shift) => string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Red-border validation styling; the message itself stays the caller's responsibility. */
  error?: boolean;
  'aria-label'?: string;
  /** Show an explicit clear (×) control once a shift is selected. Defaults to `!required`. */
  allowClear?: boolean;
}

/** Search-as-you-type shift picker — the same interaction contract as
 *  `ResidentCombobox` (arrow-key nav, Enter-to-commit with
 *  `preventDefault()` so it can never double-submit the parent form,
 *  Escape, clear button, no auto-selection), applied to shifts instead of
 *  residents. Never pre-selects a shift on its own: `value` starts and
 *  stays empty until the caller passes one in. */
export const ShiftCombobox: React.FC<ShiftComboboxProps> = ({
  id,
  shifts,
  value,
  onChange,
  formatOption,
  placeholder = 'Select active shift...',
  required = false,
  disabled = false,
  error = false,
  'aria-label': ariaLabel,
  allowClear,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = `${id || 'shift-combobox'}-listbox`;

  const selected = shifts.find(s => s.id === value);
  const displayValue = isOpen ? query : (selected ? formatOption(selected) : '');

  const results = useMemo(
    () => shifts.filter(s => matchesQuery(s, query)),
    [shifts, query]
  );

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const closeList = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const commitSelection = (shift: Shift) => {
    onChange(shift.id);
    closeList();
  };

  const clearSelection = () => {
    onChange('');
    setQuery('');
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { openList(); return; }
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) { openList(); return; }
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        commitSelection(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        closeList();
      }
    }
    // Tab is intentionally left to default browser behavior: it must never
    // select the first (or active) suggestion on its own.
  };

  const handleBlur = () => {
    // A listbox option's onMouseDown already calls preventDefault so this
    // blur never fires before its click; this is just the close-on-blur
    // path for clicking/tabbing away without picking anything.
    closeList();
  };

  const showClearButton = (allowClear ?? !required) && Boolean(value) && !disabled;
  const activeOption = isOpen && activeIndex >= 0 ? results[activeIndex] : undefined;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${listboxId}-opt-${activeOption.id}` : undefined}
          aria-label={ariaLabel}
          aria-required={required || undefined}
          autoComplete="off"
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          onFocus={openList}
          onClick={openList}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`w-full pl-8 ${showClearButton ? 'pr-8' : 'pr-3'} h-9 border rounded-control text-sm bg-panel focus:ring-2 focus:ring-accent ${error ? 'border-danger' : 'border-hairline-strong'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        {showClearButton && (
          <button
            type="button"
            aria-label="Clear selected shift"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel || 'Shifts'}
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-control border border-hairline-strong bg-panel shadow-elevated py-1 animate-popover-in"
          style={{ '--transform-origin': 'top left' } as React.CSSProperties}
        >
          {shifts.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">No active shifts available.</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">No matching shifts.</li>
          ) : (
            results.map((shift, index) => {
              const optionId = `${listboxId}-opt-${shift.id}`;
              const isActive = index === activeIndex;
              const isSelected = shift.id === value;
              return (
                <li
                  key={shift.id}
                  id={optionId}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSelection(shift)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`px-3 py-1.5 text-sm cursor-pointer ${isActive ? 'bg-accent-soft text-accent-strong' : 'text-ink'} ${isSelected ? 'font-semibold' : ''}`}
                >
                  {formatOption(shift)}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
