import { useCallback, useEffect, useState } from 'react';
export function useApiConnection() {
    const [state, setState] = useState<'connecting' | 'ready' | 'unavailable'>('connecting');
    const [version, setVersion] = useState(0);
    const retry = useCallback(() => setVersion(value => value + 1), []);
    useEffect(() => {
        const controller = new AbortController();
        const pause = (ms: number) => new Promise<void>(resolve => { const timer = setTimeout(resolve, ms); controller.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true }); });
        setState('connecting');
        void (async () => {
            for (let attempt = 0; attempt < 8 && !controller.signal.aborted; attempt++) {
                try {
                    const response = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]) });
                    if (response.ok && (await response.json()).status === 'ok') {
                        if (!controller.signal.aborted)
                            setState('ready');
                        return;
                    }
                    if (response.status >= 400 && response.status < 500)
                        break;
                }
                catch { /* Local startup and serverless cold starts can briefly be unavailable. */ }
                await pause(Math.min(500 * (attempt + 1), 2000));
            }
            if (!controller.signal.aborted)
                setState('unavailable');
        })();
        return () => controller.abort();
    }, [version]);
    return { state, retry };
}
