import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit3, Copy, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';

interface TaskActionMenuProps {
  onViewDetails?: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onStop?: () => void;
  onReactivate?: () => void;
  onDelete: () => void;
  isStopped?: boolean;
  hasHistory?: boolean;
  itemType?: 'care_task' | 'unit_task' | 'fyi' | 'wound';
  align?: 'left' | 'right';
  ariaLabel?: string;
}

export const TaskActionMenu: React.FC<TaskActionMenuProps> = ({
  onViewDetails,
  onEdit,
  onDuplicate,
  onStop,
  onReactivate,
  onDelete,
  isStopped = false,
  hasHistory = false,
  itemType = 'care_task',
  align = 'right',
  ariaLabel = 'Task actions'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // If within 220px of bottom of screen, open upwards
      if (windowHeight - rect.bottom < 220) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const typeLabel = itemType === 'care_task' ? 'Care Task' : itemType === 'unit_task' ? 'Unit Task' : itemType === 'wound' ? 'Wound' : 'FYI';

  return (
    <div className="relative inline-block text-left shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className="p-1.5 sm:p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0 cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-48 rounded-lg bg-white shadow-xl border border-slate-200 py-1 text-xs text-slate-700 focus:outline-none animate-in fade-in zoom-in-95 duration-100 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
        >
          {/* 0. View Details */}
          {onViewDetails && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onViewDetails();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <span className="font-medium">View Details & History</span>
            </button>
          )}

          {/* 1. Edit */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}
            className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-slate-50 transition-colors"
            role="menuitem"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">Edit {typeLabel}</span>
          </button>

          {/* 2. Duplicate */}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDuplicate();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-slate-50 transition-colors"
              role="menuitem"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium">Duplicate</span>
            </button>
          )}

          {/* 3. Stop / Put on Hold OR Reactivate */}
          {!isStopped && onStop && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onStop();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-amber-50 text-amber-900 transition-colors"
              role="menuitem"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
              <div>
                <span className="font-medium">Stop This Task</span>
                <p className="text-[10px] text-amber-700 font-normal">Preserves past history</p>
              </div>
            </button>
          )}

          {isStopped && onReactivate && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onReactivate();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-teal-50 text-teal-900 transition-colors"
              role="menuitem"
            >
              <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-medium">Resume / Reactivate</span>
            </button>
          )}

          <div className="border-t border-slate-100 my-1" />

          {/* 4. Delete */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-red-50 text-red-700 transition-colors"
            role="menuitem"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span className="font-medium">Delete {typeLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};
