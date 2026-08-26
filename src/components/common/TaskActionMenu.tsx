import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        setIsOpen(false);
        setMenuPosition(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setMenuPosition(null);
      }
    };
    const handleViewportChange = () => {
      setIsOpen(false);
      setMenuPosition(null);
    };

    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', handleViewportChange, true);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      const width = 192;
      const estimatedHeight = 260;
      const gap = 4;
      const padding = 8;
      const spaceBelow = window.innerHeight - rect.bottom - padding;
      const openUpwards = spaceBelow < estimatedHeight && rect.top - padding > spaceBelow;
      const left = align === 'right' ? rect.right - width : rect.left;
      setMenuPosition({
        left: Math.min(Math.max(padding, left), Math.max(padding, window.innerWidth - width - padding)),
        top: openUpwards ? undefined : rect.bottom + gap,
        bottom: openUpwards ? window.innerHeight - rect.top + gap : undefined,
        maxHeight: Math.max(160, openUpwards ? rect.top - padding - gap : spaceBelow - gap),
      });
    } else {
      setMenuPosition(null);
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

      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          style={menuPosition}
          className="fixed z-[9999] w-48 overflow-y-auto rounded-lg bg-white shadow-2xl border border-slate-200 py-1 text-xs text-slate-700 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          role="menu"
          aria-label={`${typeLabel} actions`}
          onClick={(event) => event.stopPropagation()}
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
        </div>,
        document.body,
      )}
    </div>
  );
};
