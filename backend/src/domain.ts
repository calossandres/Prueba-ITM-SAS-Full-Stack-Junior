import { BadRequestException } from '@nestjs/common';
export const CATEGORIES = ['Hardware', 'Software', 'Red', 'Accesos', 'Otros'] as const;
export const PRIORITIES = ['Baja', 'Media', 'Alta', 'Crítica'] as const;
export const STATUSES = ['Pendiente', 'En progreso', 'Resuelta', 'Cancelada'] as const;
export type Status = typeof STATUSES[number];
export const TRANSITIONS: Record<Status, readonly Status[]> = {
  Pendiente: ['En progreso', 'Cancelada'], 'En progreso': ['Resuelta'], Resuelta: [], Cancelada: [],
};
export function validateTransition(current: Status, next: Status, priority: string, observation?: string) {
  if (!TRANSITIONS[current].includes(next)) throw new BadRequestException(`No se permite pasar de ${current} a ${next}.`);
  if (priority === 'Crítica' && next === 'Resuelta' && !observation?.trim()) {
    throw new BadRequestException('Una solicitud crítica requiere una observación para resolverse.');
  }
}
