import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG } from './config.js';

/**
 * Talks to the Chrome extension's bridge content script (extension/bridge.js),
 * which is injected into this dashboard's origin.
 *
 * Protocol (window.postMessage, same window):
 *   dashboard → extension  { source: 'ct-dashboard', type: 'CT_PING' | 'CT_REQUEST_DATA' | 'CT_CLEAR' }
 *   extension → dashboard  { source: 'ct-extension', type: 'CT_HELLO' | 'CT_PONG' | 'CT_DATA', payload }
 *     CT_DATA payload: { records: [...rawSites], syncedAt, origin }
 */
export function useExtensionBridge(onData) {
  const [status, setStatus] = useState({ connected: false, version: null, lastSeen: null, lastSync: null, count: 0 });
  const lastSeenRef = useRef(0);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const send = useCallback((type, payload) => {
    window.postMessage({ source: CONFIG.DASHBOARD_SOURCE, type, payload }, window.location.origin);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || msg.source !== CONFIG.BRIDGE_SOURCE) return;
      lastSeenRef.current = Date.now();

      if (msg.type === 'CT_HELLO' || msg.type === 'CT_PONG') {
        setStatus((s) => ({
          ...s,
          connected: true,
          version: msg.payload?.version ?? s.version,
          lastSeen: new Date().toISOString(),
          count: msg.payload?.count ?? s.count,
          lastSync: msg.payload?.syncedAt ?? s.lastSync,
        }));
        if (msg.type === 'CT_HELLO') send('CT_REQUEST_DATA');
      }
      if (msg.type === 'CT_DATA') {
        const records = Array.isArray(msg.payload?.records) ? msg.payload.records : [];
        setStatus((s) => ({
          ...s,
          connected: true,
          lastSeen: new Date().toISOString(),
          lastSync: msg.payload?.syncedAt ?? new Date().toISOString(),
          count: records.length,
        }));
        onDataRef.current?.(records.map((r) => ({ ...r, source: 'extension' })));
      }
    };
    window.addEventListener('message', handler);

    send('CT_PING');
    send('CT_REQUEST_DATA');
    const ping = setInterval(() => {
      send('CT_PING');
      if (Date.now() - lastSeenRef.current > CONFIG.BRIDGE_TIMEOUT_MS) {
        setStatus((s) => (s.connected ? { ...s, connected: false } : s));
      }
    }, CONFIG.BRIDGE_PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('message', handler);
      clearInterval(ping);
    };
  }, [send]);

  const requestData = useCallback(() => send('CT_REQUEST_DATA'), [send]);
  const clearExtensionData = useCallback(() => send('CT_CLEAR'), [send]);

  return { status, requestData, clearExtensionData };
}
