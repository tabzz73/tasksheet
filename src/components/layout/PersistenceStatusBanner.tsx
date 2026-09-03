import React, { useEffect, useRef, useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { db, PersistStatus } from '../../db';

const AUTO_RETRY_DELAY_MS = 2000;

export const PersistenceStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<PersistStatus>(() => db.getPersistStatus());
  const autoRetried = useRef(false);

  useEffect(() => {
    return db.subscribeToPersistErrors(nextStatus => {
      if (nextStatus !== 'error') autoRetried.current = false;
      setStatus(nextStatus);
    });
  }, []);

  useEffect(() => {
    if (status !== 'error' || autoRetried.current) return;
    autoRetried.current = true;
    const timer = setTimeout(() => db.retryPersist(), AUTO_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (status !== 'error') return null;

  return (
    <section
      className="relative z-20 shrink-0 border-b border-danger bg-danger-soft px-4 py-3 text-danger"
      role="alert"
      aria-label="Save failed"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black uppercase tracking-wide">Could not save your last change to disk</p>
            <p className="text-xs font-medium">
              TaskSheet is still showing your latest changes on screen, but the last one hasn't been written to disk yet.
              Check available disk space, then retry — export a backup from Settings if this continues.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => db.retryPersist()} className="btn btn-primary shrink-0">
          Retry Now
        </button>
      </div>
    </section>
  );
};
