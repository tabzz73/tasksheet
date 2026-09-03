import React from 'react';
import { AlertTriangle, Info, ShieldAlert, XCircle } from 'lucide-react';
import { ValidationResult } from '../../services/validation';

export const ConflictNotice: React.FC<{ result: ValidationResult; compact?: boolean; onAction?: (id: string) => void }> = ({ result, compact = false, onAction }) => {
  const blocked = result.status === 'BLOCKED' || result.status === 'CRITICAL';
  const Icon = result.status === 'INFO' ? Info : result.status === 'CRITICAL' ? XCircle : blocked ? ShieldAlert : AlertTriangle;
  const tone = result.status === 'INFO' ? 'border-hairline-strong bg-accent-soft text-accent-strong' : result.status === 'WARNING' ? 'border-warning bg-warning-soft text-warning' : 'border-danger bg-danger-soft text-danger';
  return <section role={blocked ? 'alert' : 'status'} aria-live="polite" tabIndex={-1} className={`rounded-surface border p-3 ${tone}`}>
    <div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0"/><div className="min-w-0"><h4 className="text-xs font-black">{result.title}</h4><p className="mt-1 text-xs leading-relaxed">{result.message}</p></div></div>
    {!compact && result.affectedRecords?.length ? <div className="mt-3 max-h-40 overflow-y-auto rounded-control border border-current/15 bg-panel/60 p-2"><p className="mb-1 text-[10px] font-black uppercase tracking-wider">Affected records ({result.affectedRecords.length})</p>{result.affectedRecords.slice(0, 50).map(item => <div key={`${item.type}-${item.id}`} className="border-t border-current/10 py-1.5 first:border-0 text-[11px]"><strong>{item.time ? `${item.time} · ` : ''}{item.label}</strong>{item.detail ? <span> — {item.detail}</span> : null}</div>)}</div> : null}
    {onAction && result.recommendedActions?.length ? <div className="mt-3 flex flex-wrap gap-2">{result.recommendedActions.map(action => <button key={action.id} type="button" onClick={() => onAction(action.id)} className={`rounded-control px-3 py-1.5 text-[11px] font-bold ${action.kind === 'primary' ? 'bg-ink text-white' : 'border border-current/25 bg-panel/70'}`}>{action.label}</button>)}</div> : null}
  </section>;
};
