import { RequestDto, StatusDto } from './dto';
import { BadRequestException, ConflictException, ServiceUnavailableException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Database } from './database';
import { RequestsService, SupportRequest } from './requests.service';
export const UPLOAD_LIMIT = 3 * 1024 * 1024;
export async function normalizeImage(input: Buffer): Promise<Buffer> {
  if (!input.length || input.length > UPLOAD_LIMIT) throw new BadRequestException('No se pudo recibir la imagen optimizada. Selecciónala de nuevo.');
  try {
    const source = sharp(input, { limitInputPixels: 64_000_000, failOn: 'warning' });
    const metadata = await source.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('unsupported');
    const result = await source.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (result.length > UPLOAD_LIMIT) throw new Error('too large');
    return result;
  } catch { throw new BadRequestException('El archivo debe ser una imagen JPG, PNG o WebP válida y estática.'); }
}
@Injectable()
export class ImagesService {
  private readonly logger = new Logger('Images');
  constructor(@Inject(Database) private readonly db: Database, @Inject(RequestsService) private readonly requests: RequestsService) {}
  private async ensureMigration() {
    const readiness = await this.db.rpc<{ evidence_images?: boolean }>('health');
    if (!readiness.evidence_images) throw new ServiceUnavailableException('Ejecuta la migración 006_problem_and_solution_images.sql en Supabase para habilitar las imágenes del problema y la solución.');
  }
  private async cleanup(path: string) {
    try { await this.db.removeImage(path); }
    catch { this.logger.warn('No se pudo limpiar una imagen cuya operación no se confirmó.'); }
  }
  async create(data: RequestDto, file?: Express.Multer.File) {
    if (!file) return this.requests.create(data);
    const normalized = await normalizeImage(file.buffer);
    await this.ensureMigration();
    const id = randomUUID();
    const path = `${id}/${randomUUID()}.webp`;
    await this.db.uploadImage(path, normalized);
    try { return await this.db.rpc<SupportRequest>('create', { ...data, id, image_path: path }); }
    catch (error) { await this.cleanup(path); throw error; }
  }
  async changeStatus(id: string, data: StatusDto, file?: Express.Multer.File) {
    if (!file) return this.requests.changeStatus(id, data);
    if (data.status !== 'Resuelta') throw new BadRequestException('La imagen de la solución solo puede adjuntarse al resolver la solicitud.');
    const current = await this.db.rpc<SupportRequest>('detail', { id });
    if (current.status !== 'En progreso') throw new ConflictException('Solo una solicitud en progreso puede resolverse con evidencia.');
    if (current.priority === 'Crítica' && !data.observation?.trim()) throw new BadRequestException('Una solicitud crítica requiere una observación para resolverse.');
    const normalized = await normalizeImage(file.buffer);
    await this.ensureMigration();
    const path = `${id}/solution-${randomUUID()}.webp`;
    await this.db.uploadImage(path, normalized);
    try { return await this.db.rpc<SupportRequest>('status', { ...data, id, solution_image_path: path }); }
    catch (error) { await this.cleanup(path); throw error; }
  }
}
