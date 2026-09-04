import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertTriangle, 
  Clock, 
  Utensils, 
  Users, 
  FileEdit, 
  Eye, 
  ShieldAlert, 
  Wrench, 
  ClipboardCheck,
  Info,
  ChevronRight
} from 'lucide-react';
import { TaskAttentionConfig, TaskAttentionIndicator, AttentionIndicatorMetadata } from '../../types';
import { getIndicatorBadgeDetails } from '../../services/attention';

interface TaskAttentionBadgesProps {
  attentionConfig?: TaskAttentionConfig;
  maxVisible?: number;
  size?: 'xs' | 'sm';
  className?: string;
}

export const TaskAttentionBadges: React.FC<TaskAttentionBadgesProps> = ({
  attentionConfig,
  maxVisible = 2,
  size = 'xs',
  className = '',
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    index: number;
    left: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const openTooltip = (index: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 256;
    const viewportPadding = 8;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - tooltipWidth),
      Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding),
    );
    const hasRoomBelow = window.innerHeight - rect.bottom >= 220;
    setActiveTooltip(hasRoomBelow
      ? { index, left, top: rect.bottom + 6 }
      : { index, left, bottom: window.innerHeight - rect.top + 6 });
  };

  if (!attentionConfig || !attentionConfig.indicators || attentionConfig.indicators.length === 0) {
    return null;
  }

  const indicators = attentionConfig.indicators;
  const visibleIndicators = indicators.slice(0, maxVisible);
  const overflowCount = indicators.length - maxVisible;

  const renderIcon = (iconName: string, iconClass: string) => {
    switch (iconName) {
      case 'alert-triangle': return <AlertTriangle className={iconClass} />;
      case 'clock': return <Clock className={iconClass} />;
      case 'utensils': return <Utensils className={iconClass} />;
      case 'users': return <Users className={iconClass} />;
      case 'file-edit': return <FileEdit className={iconClass} />;
      case 'eye': return <Eye className={iconClass} />;
      case 'shield': return <ShieldAlert className={iconClass} />;
      case 'tool': return <Wrench className={iconClass} />;
      case 'clipboard': return <ClipboardCheck className={iconClass} />;
      default: return <Info className={iconClass} />;
    }
  };

  const findMetadata = (ind: TaskAttentionIndicator): AttentionIndicatorMetadata | undefined => {
    return attentionConfig.metadata?.find(m => m.indicator === ind);
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {visibleIndicators.map((indicator, index) => {
        const details = getIndicatorBadgeDetails(indicator, attentionConfig.mealRelation);
        const meta = findMetadata(indicator);
        const isHovered = activeTooltip?.index === index;

        return (
          <div
            key={indicator}
            className="relative"
            tabIndex={0}
            onMouseEnter={(event) => openTooltip(index, event.currentTarget)}
            onMouseLeave={() => setActiveTooltip(null)}
            onFocus={(event) => openTooltip(index, event.currentTarget)}
            onBlur={() => setActiveTooltip(null)}
          >
            <span
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono font-black tracking-wider transition-all cursor-help select-none ${
                size === 'xs' ? 'text-[9.5px]' : 'text-[11px]'
              } ${details.badgeBg} ${details.badgeText} ${details.badgeBorder}`}
              title={details.tooltip}
            >
              {renderIcon(details.iconName, size === 'xs' ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0')}
              <span>{details.shortAbbreviation}</span>
            </span>

            {/* Explainable Popover Tooltip */}
            {isHovered && typeof document !== 'undefined' && createPortal(
              <div
                role="tooltip"
                style={{ left: activeTooltip.left, top: activeTooltip.top, bottom: activeTooltip.bottom }}
                className="fixed w-64 max-h-[calc(100vh-1rem)] overflow-y-auto p-2.5 bg-ink text-white rounded-surface shadow-elevated text-xs z-[9999] pointer-events-none animate-popover-in border border-white/10"
              >
                <div className="flex items-center space-x-1.5 mb-1 pb-1 border-b border-white/10 font-bold">
                  {renderIcon(details.iconName, 'w-3.5 h-3.5 text-amber-400')}
                  <span className="text-white">{details.label}</span>
                  <span className="text-[10px] text-white/50 font-mono ml-auto">[{details.code}]</span>
                </div>

                <p className="text-[11px] text-white/70 mb-1.5 leading-snug">
                  {details.tooltip}
                </p>

                {meta?.reason && (
                  <div className="text-[10px] text-white/50 bg-white/10 p-1.5 rounded-control space-y-0.5 mb-1">
                    <span className="text-white/70 font-medium block">Reason / Trigger:</span>
                    <span>{meta.reason}</span>
                    {meta.source && (
                      <span className="text-white/40 block italic">
                        Source: {meta.source === 'catalog' ? 'Alberta Starter Catalog rule' : meta.source === 'facility_rule' ? 'Facility attention rule' : 'Smart text suggestion'}
                      </span>
                    )}
                  </div>
                )}

                {/* Additional contextual notes */}
                {meta?.equipmentNote && (
                  <div className="text-[10px] text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50 mb-1">
                    Equipment: {meta.equipmentNote}
                  </div>
                )}
                {meta?.docRefNote && (
                  <div className="text-[10px] text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/50 mb-1">
                    Documentation: {meta.docRefNote}
                  </div>
                )}

                <div className="text-[9px] text-white/40 pt-1 border-t border-white/10 italic text-right">
                  Confirm against facility policy
                </div>
              </div>,
              document.body,
            )}
          </div>
        );
      })}

      {/* Overflow Badge (+N) */}
      {overflowCount > 0 && (
        <div
          className="relative"
          tabIndex={0}
          onMouseEnter={(event) => openTooltip(999, event.currentTarget)}
          onMouseLeave={() => setActiveTooltip(null)}
          onFocus={(event) => openTooltip(999, event.currentTarget)}
          onBlur={() => setActiveTooltip(null)}
        >
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded border border-hairline-strong bg-panel-sunken text-ink-soft font-mono font-bold cursor-help select-none ${
              size === 'xs' ? 'text-[9.5px]' : 'text-[11px]'
            }`}
          >
            +{overflowCount}
          </span>

          {activeTooltip?.index === 999 && typeof document !== 'undefined' && createPortal(
            <div
              role="tooltip"
              style={{ left: activeTooltip.left, top: activeTooltip.top, bottom: activeTooltip.bottom }}
              className="fixed w-64 max-h-[calc(100vh-1rem)] overflow-y-auto p-2.5 bg-ink text-white rounded-surface shadow-elevated text-xs z-[9999] pointer-events-none border border-white/10"
            >
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                All Attention Indicators ({indicators.length}):
              </span>
              <div className="space-y-1.5 text-[11px]">
                {indicators.map(ind => {
                  const d = getIndicatorBadgeDetails(ind, attentionConfig.mealRelation);
                  return (
                    <div key={ind} className="flex items-center space-x-1.5 text-white/80">
                      {renderIcon(d.iconName, 'w-3 h-3 text-white/50 shrink-0')}
                      <span className="font-bold">[{d.shortAbbreviation}] {d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )}
        </div>
      )}
    </div>
  );
};
