export async function api<T>(path: string, options?: RequestInit): Promise<T> {
    const isForm = options?.body instanceof FormData;
    const response = await fetch(`/api${path}`, { ...options, headers: { ...(!isForm ? { 'Content-Type': 'application/json' } : {}), ...options?.headers }, cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok)
        throw new Error(Array.isArray(data?.message) ? data.message.join('. ') : (data?.message || 'No se pudo completar la operación. Inténtalo de nuevo.'));
    return data as T;
}
