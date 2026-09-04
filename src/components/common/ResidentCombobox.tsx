import React, { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Resident } from '../../types';
import { sortRoomNumbers } from '../../services/generator';
import { getResidentStatusLabel } from '../../services/residentStatus';

/** Canonical resident display label used everywhere a resident is shown in
 *  a picker: "Room · First Last", degrading gracefully to just the name
 *  when no room is set. A non-active status (hospital/pass/hold/etc.) is
 *  appended so residents stay selectable and visibly labeled rather than
 *  silently hidden. */
export function formatResidentOptionLabel(resident: Pick<Resident, 'firstName' | 'lastName' | 'roomNumber' | 'status'>): string {
  const name = `${resident.firstName} ${resident.lastName}`.trim();
  const base = resident.roomNumber ? `${resident.roomNumber} · ${name}` : name;
  return resident.status && resident.status !== 'active' ? `${base} · ${getResidentStatusLabel(resident.status)}` : base;
}

function matchesQuery(resident: Resident, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
  return (
    resident.firstName.toLowerCase().includes(q) ||
    resident.lastName.toLowerCase().includes(q) ||
    fullName.includes(q) ||
    (resident.roomNumber || '').toLowerCase().includes(q)
  );
}

const INITIAL_LIMIT = 8;
const FILTERED_LIMIT = 50;

interface ResidentComboboxProps {
  id?: string;
  residents: Resident[];
  value: string;
  onChange: (residentId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Red-border validation styling; the message itself stays the caller's responsibility. */
  error?: boolean;
  'aria-label'?: string;
  /** Show an explicit clear (×) control once a resident is selected. Defaults to `!required`. */
  allowClear?: boolean;
}

/** The one shared "search a room/name, pick a resident" control for the
 *  whole app. Never pre-selects a resident on its own — `value` starts and
 *  stays empty until the caller passes one in (either because the user
 *  picked one here, or because the workflow legitimately opened from an
 *  already-known resident context). */
export const ResidentCombobox: React.FC<ResidentComboboxProps> = ({
  id,
  residents,
  value,
  onChange,
  placeholder = 'Search resident...',
  required = false,
  disabled = false,
  error = false,
  'aria-label': ariaLabel,
  allowClear,
}) => {
  // `query` only ever holds live search text while the list is open. When
  // closed, the displayed text is derived straight from `value` each render
  // — no effect needed to keep it "in sync", so edit-mode preselection and
  // any external reset of `value` (e.g. a modal's own reset()) just work.
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id || 'resident-combobox'}-listbox`;

  const selected = residents.find(r => r.id === value);
  const displayValue = isOpen ? query : (selected ? formatResidentOptionLabel(selected) : '');

  const results = useMemo(() => {
    const filtered = residents
      .filter(r => matchesQuery(r, query))
      .sort((a, b) => sortRoomNumbers(a.roomNumber || '', b.roomNumber || '') || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    const limit = query.trim() ? FILTERED_LIMIT : INITIAL_LIMIT;
    return filtered.slice(0, limit);
  }, [residents, query]);

  const openList = () => {
    if (disabled) return;
    // Clicking/focusing an already-selected field clears the box for fresh
    // typing — the underlying selection is untouched until the user
    // explicitly commits a new one or types nothing and blurs.
    setQuery('');
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const closeList = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const commitSelection = (resident: Resident) => {
    onChange(resident.id);
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
    // path for clicking/tabbing away without picking anything. Closing
    // (rather than committing the typed text) is what reverts the display
    // back to the real selection, since displayValue is derived from
    // `value`, not from whatever was typed.
    closeList();
  };

  const showClearButton = (allowClear ?? !required) && Boolean(value) && !disabled;
  const activeOption = isOpen && activeIndex >= 0 ? results[activeIndex] : undefined;

  return (
    <div ref={containerRef} className="relative">
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
            aria-label="Clear selected resident"
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
          aria-label={ariaLabel || 'Residents'}
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-control border border-hairline-strong bg-panel shadow-elevated py-1"
        >
          {residents.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">No residents available.</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">No matching residents.</li>
          ) : (
            results.map((resident, index) => {
              const optionId = `${listboxId}-opt-${resident.id}`;
              const isActive = index === activeIndex;
              const isSelected = resident.id === value;
              return (
                <li
                  key={resident.id}
                  id={optionId}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSelection(resident)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`px-3 py-1.5 text-sm cursor-pointer ${isActive ? 'bg-accent-soft text-accent-strong' : 'text-ink'} ${isSelected ? 'font-semibold' : ''}`}
                >
                  {formatResidentOptionLabel(resident)}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
