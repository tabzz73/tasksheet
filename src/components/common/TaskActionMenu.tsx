import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, MoreVertical, Edit3, Copy, PauseCircle, PlayCircle, RotateCcw, Trash2 } from 'lucide-react';

interface TaskActionMenuProps {
  onViewDetails?: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onStop?: () => void;
  onReactivate?: () => void;
  onRestart?: () => void;
  onResolve?: () => void;
  onDelete: () => void;
  isStopped?: boolean;
  isEnded?: boolean;
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
  onRestart,
  onResolve,
  onDelete,
  isStopped = false,
  isEnded = false,
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
      const estimatedHeight = isEnded ? 330 : 260;
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
        className="p-1.5 sm:p-1 rounded-control text-faint hover:text-ink hover:bg-panel-sunken active:bg-hairline transition-colors focus:outline-none focus:ring-2 focus:ring-accent min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0 cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          style={menuPosition}
          className="fixed z-[9999] w-48 overflow-y-auto rounded-surface bg-panel shadow-elevated border border-hairline-strong py-1 text-xs text-ink-soft focus:outline-none animate-in fade-in zoom-in-95 duration-100"
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
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-panel-sunken transition-colors"
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
            className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-panel-sunken transition-colors"
            role="menuitem"
          >
            <Edit3 className="w-3.5 h-3.5 text-muted" />
            <span className="font-medium">{isEnded ? 'Edit / Extend Schedule' : `Edit ${typeLabel}`}</span>
          </button>

          {isEnded && onRestart && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRestart();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-accent-soft text-accent-strong transition-colors"
              role="menuitem"
            >
              <RotateCcw className="w-3.5 h-3.5 text-accent" />
              <div>
                <span className="font-medium">Restart Schedule Today</span>
                <p className="text-[10px] text-accent-strong font-normal">Preserves the recurrence pattern</p>
              </div>
            </button>
          )}

          {/* 2. Duplicate */}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDuplicate();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-panel-sunken transition-colors"
              role="menuitem"
            >
              <Copy className="w-3.5 h-3.5 text-muted" />
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
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-warning-soft text-warning transition-colors"
              role="menuitem"
            >
              <PauseCircle className="w-3.5 h-3.5 text-warning" />
              <div>
                <span className="font-medium">Stop This Task</span>
                <p className="text-[10px] text-warning font-normal">Preserves past history</p>
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
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-accent-soft text-accent-strong transition-colors"
              role="menuitem"
            >
              <PlayCircle className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium">Resume / Reactivate</span>
            </button>
          )}

          {itemType === 'wound' && onResolve && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onResolve();
              }}
              className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-positive-soft text-positive transition-colors"
              role="menuitem"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
              <div>
                <span className="font-medium">Mark Protocol Resolved</span>
                <p className="text-[10px] text-positive font-normal">Clinical confirmation required</p>
              </div>
            </button>
          )}

          <div className="border-t border-hairline my-1" />

          {/* 4. Delete */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            className="w-full px-3.5 py-2.5 sm:py-2 text-left flex items-center space-x-2 hover:bg-danger-soft text-danger transition-colors"
            role="menuitem"
          >
            <Trash2 className="w-3.5 h-3.5 text-danger" />
            <span className="font-medium">Delete {typeLabel}</span>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
};
