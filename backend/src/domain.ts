export const CATEGORIES = ['Hardware', 'Software', 'Red', 'Accesos', 'Otros'] as const;
export const PRIORITIES = ['Baja', 'Media', 'Alta', 'Crítica'] as const;
export const STATUSES = ['Pendiente', 'En progreso', 'Resuelta', 'Cancelada'] as const;
export type Status = typeof STATUSES[number];
export const TRANSITIONS: Record<Status, readonly Status[]> = {
  Pendiente: ['En progreso', 'Cancelada'], 'En progreso': ['Resuelta'], Resuelta: [], Cancelada: [],
};
