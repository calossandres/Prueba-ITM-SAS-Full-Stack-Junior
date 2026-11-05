export const categories = ['Hardware', 'Software', 'Red', 'Accesos', 'Otros'];
export const priorities = ['Baja', 'Media', 'Alta', 'Crítica'];
export const statuses = ['Pendiente', 'En progreso', 'Resuelta', 'Cancelada'];
export const transitions: Record<string, string[]> = { Pendiente: ['En progreso', 'Cancelada'], 'En progreso': ['Resuelta'], Resuelta: [], Cancelada: [] };
export type RequestItem = {
    id: string;
    title: string;
    description: string;
    requester: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
    image_path?: string | null;
    image_url?: string | null;
    solution_image_path?: string | null;
    solution_image_url?: string | null;
    solution_image_actor?: string | null;
    solution_image_at?: string | null;
};
export type HistoryItem = {
    id: string;
    kind: string;
    from_status: string | null;
    to_status: string;
    actor: string;
    observation: string | null;
    created_at: string;
    changes: Record<string, {
        before: unknown;
        after: unknown;
    }> | null;
};
export type Page = {
    items: RequestItem[];
    total: number;
    page: number;
    limit: number;
};
export type Form = {
    title: string;
    description: string;
    requester: string;
    category: string;
    priority: string;
    actor: string;
};
export const initialForm: Form = { title: '', description: '', requester: '', category: 'Software', priority: 'Media', actor: '' };
export const date = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
