import { useEffect, useState } from 'react';
import { db } from '../db';
import { AppUser } from '../types';
import { restoreSession, logout as authLogout } from '../services/auth';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Runs once per app instance, after the db has loaded (isReady is the
  // caller's responsibility to gate on first — see App.tsx). Re-derives
  // currentUser from db state on every change so a role/active edit made in
  // Settings → Users & Access reflects immediately for the signed-in user
  // too (e.g. a self-demotion or another admin deactivating this account).
  useEffect(() => {
    const restored = restoreSession();
    setCurrentUser(restored);
    setSessionChecked(true);

    const unsubscribe = db.subscribe(() => {
      const actor = db.getCurrentActor();
      if (!actor) { setCurrentUser(null); return; }
      const fresh = db.getState().users.find(u => u.id === actor.id) || null;
      // A signed-in user who is deactivated mid-session loses access on the
      // next state change rather than being cascaded out immediately —
      // consistent with "disabled users cannot sign in" applying at the
      // login boundary, while an already-open session degrades gracefully.
      setCurrentUser(fresh && fresh.active ? fresh : null);
    });
    return unsubscribe;
  }, []);

  const logout = () => {
    authLogout();
    setCurrentUser(null);
  };

  return { currentUser, sessionChecked, setCurrentUser, logout };
}
