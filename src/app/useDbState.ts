import { useEffect, useState } from 'react';
import { db } from '../db';
import { AppDatabaseState } from '../types';

export function useDbState() {
  const [dbState, setDbState] = useState<AppDatabaseState>(db.getState());

  useEffect(() => {
    const unsubscribe = db.subscribe((newState) => {
      setDbState({ ...newState });
    });
    return unsubscribe;
  }, []);

  return dbState;
}
