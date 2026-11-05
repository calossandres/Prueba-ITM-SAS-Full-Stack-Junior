import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
export function throwDatabaseError(error: { code?: string; message?: string }): never {
  if (error.code === 'PT404') throw new NotFoundException(error.message);
  if (error.code === 'PT409') throw new ConflictException(error.message);
  if (['PT400', '23514', '22023'].includes(error.code || '')) throw new BadRequestException(error.message);
  new Logger('Supabase').error(`Consulta fallida; código: ${error.code || 'NETWORK'}`);
  throw new ServiceUnavailableException('No se pudo consultar Supabase. Revisa SUPABASE_URL, SUPABASE_SECRET_KEY y las migraciones SQL.');
}
@Injectable()
export class Database {
  private client?: SupabaseClient;
  private getClient() {
    if (!this.client) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY;
      if (!url || !key) throw new ServiceUnavailableException('Configura SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local.');
      this.client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
    }
    return this.client;
  }
  async rpc<T = any>(operation: string, payload: object = {}): Promise<T> {
    const { data, error } = await this.getClient().rpc('support_api', { p_operation: operation, p_payload: payload });
    if (error) throwDatabaseError(error);
    return data as T;
  }
  private readonly imageBucket = 'request-images';
  async uploadImage(path: string, contents: Buffer) {
    const { error } = await this.getClient().storage.from(this.imageBucket).upload(path, contents, { contentType: 'image/webp', upsert: false });
    if (error) throwDatabaseError({ code: 'STORAGE_UPLOAD' });
  }
  async removeImage(path: string) {
    const { error } = await this.getClient().storage.from(this.imageBucket).remove([path]);
    if (error) throwDatabaseError({ code: 'STORAGE_DELETE' });
  }
  async imageUrl(path: string): Promise<string> {
    const { data, error } = await this.getClient().storage.from(this.imageBucket).createSignedUrl(path, 600);
    if (error) throwDatabaseError({ code: 'STORAGE_READ' });
    return data.signedUrl;
  }
}
