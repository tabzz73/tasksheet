import { useEffect, useState } from 'react';
import { db } from '../db';
import { AppDatabaseState } from '../types';

export function useDbState() {
  const [dbState, setDbState] = useState<AppDatabaseState>(db.getState());
  const [isReady, setIsReady] = useState(db.isReady());

  useEffect(() => {
    const unsubscribe = db.subscribe((newState) => {
      setDbState({ ...newState });
      setIsReady(db.isReady());
    });
    return unsubscribe;
  }, []);

  return { dbState, isReady };
}
