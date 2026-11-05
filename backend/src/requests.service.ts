import { Inject, Injectable } from '@nestjs/common';
import { Database } from './database';
import { ListDto, RequestDto, StatusDto, UpdateRequestDto } from './dto';
import { Status } from './domain';
export interface SupportRequest { id: string; title: string; description: string; requester: string; category: string; priority: string; status: Status; created_at: string; updated_at: string; image_path?: string | null; image_url?: string | null }
@Injectable()
export class RequestsService {
  constructor(@Inject(Database) private readonly db: Database) {}
  list(query: ListDto) { return this.db.rpc('list', query); }
  async detail(id: string) { const item = await this.db.rpc<SupportRequest>('detail', { id }); return { ...item, image_url: item.image_path ? await this.db.imageUrl(item.image_path) : null }; }
  history(id: string) { return this.db.rpc('history', { id }); }
  create(data: RequestDto) { return this.db.rpc<SupportRequest>('create', data); }
  update(id: string, data: UpdateRequestDto) { return this.db.rpc<SupportRequest>('update', { ...data, id }); }
  changeStatus(id: string, data: StatusDto) { return this.db.rpc<SupportRequest>('status', { ...data, id }); }
}
