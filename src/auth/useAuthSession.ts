import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import { getPendingEventCount } from '../intelligence/localEventQueue';

export function useAuthSession() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [pendingEventCount, setPendingEventCount] = useState(0);

  const refresh = useCallback(async () => {
    const [signedIn, pending] = await Promise.all([
      isSupabaseSignedIn(),
      getPendingEventCount(),
    ]);
    setIsSignedIn(signedIn);
    setPendingEventCount(pending);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { isSignedIn, pendingEventCount, refresh };
}
