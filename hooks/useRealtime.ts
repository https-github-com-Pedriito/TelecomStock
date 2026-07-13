'use client';

import { useEffect } from 'react';
import { getToken } from '@/lib/tokenManager';

export function useRealtime(onEvent: (event: { table: string; type: string; data?: unknown }) => void) {
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const es = new EventSource(`/api/realtime?token=${token}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== 'connected') onEvent(data);
      } catch {}
    };
    return () => es.close();
  }, [onEvent]);
}
