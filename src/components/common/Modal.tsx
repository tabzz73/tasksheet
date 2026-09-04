import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

/** Strong ease-out — the built-in CSS easings read as weak/mushy for a
 *  panel this size; this curve gives the open a noticeable "arrival". */
const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';
const TRANSITION_MS = 200;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Optional sticky action row, pinned below the scrolling content instead
   *  of scrolling away with it. Rendered inside the same focus-trapped panel
   *  as `children`, so its buttons are still reachable via Tab. */
  footer?: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  footer
}) => {
  const modalId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // `shouldRender` is derived straight from `isOpen` (plus `closing`) so the
  // panel mounts on the SAME render where isOpen first becomes true — not a
  // render cycle later. That matters beyond visuals: the focus-on-open
  // effect below reads `panelRef.current` in the same commit, so if mounting
  // lagged by even one render, it would find nothing and focus would
  // silently fail. `closing` alone extends rendering for TRANSITION_MS after
  // isOpen goes false, so the panel can animate out instead of hard-cutting.
  const wasOpenRef = useRef(false);
  const [closing, setClosing] = useState(false);
  // `entered` starts false on every fresh mount so the very first paint
  // renders the closed styles; a frame later it flips true and the CSS
  // transition carries it to the open styles. Without this two-frame gap
  // the open and closed styles would both apply on the same paint and
  // nothing would visibly animate. This only gates which styles apply —
  // never whether the panel is mounted — so it can't affect focus timing.
  const [entered, setEntered] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);

  // Lock body scroll while open so ambient wheel/touch input can't scroll
  // the page behind a modal — without this, a stray scroll over the panel
  // (e.g. reading a long Shift Huddle briefing) scrolls the underlying page
  // and the modal, which tracks `isOpen`, disappears mid-read with no undo.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    window.clearTimeout(closeTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (isOpen) {
      wasOpenRef.current = true;
      setClosing(false);
      setEntered(false);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setEntered(true));
      });
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setClosing(true);
      setEntered(false);
      closeTimerRef.current = setTimeout(() => setClosing(false), TRANSITION_MS);
    }
    return () => {
      window.clearTimeout(closeTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  const shouldRender = isOpen || closing;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      // A caller can mark one field `data-autofocus` (e.g. the first real
      // input, instead of the close button) to claim initial focus
      // deterministically — no rAF-timing race against a second effect.
      const marked = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (marked || (focusable && focusable[0]) || panelRef.current)?.focus();
    } else {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  // Centered scale-in is correct here (unlike a trigger-anchored popover):
  // a modal isn't tied to a specific button, so it should arrive from the
  // middle of the viewport, not from an edge.
  const open = entered && !closing;
  const titleId = `${modalId}-title`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ transition: `background-color ${TRANSITION_MS}ms ${EASE_OUT}`, backgroundColor: open ? 'color-mix(in srgb, var(--color-ink) 50%, transparent)' : 'transparent' }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} bg-panel rounded-surface shadow-elevated border border-hairline-strong overflow-hidden my-auto outline-none flex flex-col max-h-[85vh]`}
        style={{
          transition: `opacity ${TRANSITION_MS}ms ${EASE_OUT}, transform ${TRANSITION_MS}ms ${EASE_OUT}`,
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1)' : 'scale(0.96)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3.5 min-h-14 border-b border-hairline bg-panel-sunken shrink-0">
          <div className="min-w-0">
            <h3 id={titleId} className="font-heading text-[15px] font-bold text-ink leading-tight truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 ml-3 text-muted hover:text-ink p-1.5 rounded-control hover:bg-panel transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto min-h-0">
          {children}
        </div>

        {/* Sticky footer — pinned below the scrolling content so the
            primary action never scrolls out of reach on a long form. */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-hairline bg-panel-sunken shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
