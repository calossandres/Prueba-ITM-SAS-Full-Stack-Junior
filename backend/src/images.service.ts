import { RequestDto } from './dto';
import { BadRequestException, ConflictException, ServiceUnavailableException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Database } from './database';
import { RequestsService, SupportRequest } from './requests.service';
export const UPLOAD_LIMIT = 3 * 1024 * 1024;
export async function normalizeImage(input: Buffer): Promise<Buffer> {
    if (!input.length || input.length > UPLOAD_LIMIT)
        throw new BadRequestException('No se pudo recibir la imagen optimizada. Selecciónala de nuevo.');
    try {
        const source = sharp(input, { limitInputPixels: 64000000, failOn: 'warning' });
        const metadata = await source.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) {
            throw new Error('unsupported');
        }
        // Re-encoding strips metadata and rejects bytes that only masquerade as an image.
        const result = await source.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        if (result.length > UPLOAD_LIMIT)
            throw new Error('too large');
        return result;
    }
    catch {
        throw new BadRequestException('El archivo debe ser una imagen JPG, PNG o WebP válida y estática.');
    }
}
@Injectable()
export class ImagesService {
    private readonly logger = new Logger('Images');
    constructor(
    @Inject(Database)
    private readonly db: Database,
    @Inject(RequestsService)
    private readonly requests: RequestsService) { }
    async create(data: RequestDto, file?: Express.Multer.File) {
        if (!file)
            return this.requests.create(data);
        const normalized = await normalizeImage(file.buffer);
        const readiness = await this.db.rpc<{
            image_creation_atomic?: boolean;
        }>('health');
        if (!readiness.image_creation_atomic)
            throw new ServiceUnavailableException('Ejecuta la migración 005_atomic_creation_image.sql en Supabase antes de crear solicitudes con imagen.');
        const id = randomUUID();
        const path = `${id}/${randomUUID()}.webp`;
        await this.db.uploadImage(path, normalized);
        try {
            return await this.db.rpc<SupportRequest>('create', { ...data, id, image_path: path });
        }
        catch (error) {
            await this.cleanup(path);
            throw error;
        }
    }
    private async openRequest(id: string) {
        const item = await this.requests.detail(id);
        if (['Resuelta', 'Cancelada'].includes(item.status))
            throw new ConflictException('Una solicitud cerrada no permite modificar su imagen.');
        return item;
    }
    private async cleanup(path: string | null | undefined) {
        if (!path)
            return;
        try {
            await this.db.removeImage(path);
        }
        catch {
            this.logger.warn('No se pudo limpiar una imagen sin referencia.');
        }
    }
    private async attach(id: string, path: string | null, actor: string) {
        const { previous_image_path, ...item } = await this.db.rpc<SupportRequest & {
            previous_image_path: string | null;
        }>('image', { id, path, actor });
        if (previous_image_path !== path)
            await this.cleanup(previous_image_path);
        return item;
    }
    async upload(id: string, file: Express.Multer.File | undefined, actor: string) {
        if (!file)
            throw new BadRequestException('Selecciona una imagen.');
        await this.openRequest(id);
        const normalized = await normalizeImage(file.buffer);
        const path = `${id}/${randomUUID()}.webp`;
        await this.db.uploadImage(path, normalized);
        try {
            return await this.attach(id, path, actor);
        }
        catch (error) {
            await this.cleanup(path);
            throw error;
        }
    }
    async remove(id: string, actor: string) {
        await this.openRequest(id);
        return this.attach(id, null, actor);
    }
}
