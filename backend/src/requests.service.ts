import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Database } from './database';
import { ListDto, RequestDto, StatusDto, UpdateRequestDto } from './dto';
import { Status, validateTransition } from './domain';
export interface SupportRequest { id: string; title: string; description: string; requester: string; category: string; priority: string; status: Status; created_at: string; updated_at: string }
@Injectable()
export class RequestsService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(query: ListDto) {
    const values: unknown[] = []; const conditions: string[] = [];
    for (const field of ['status', 'priority', 'category'] as const) {
      if (query[field]) { values.push(query[field]); conditions.push(`${field} = $${values.length}`); }
    }
    if (query.q) { values.push(`%${query.q.replace(/[\\%_]/g, '\\$&')}%`); conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length} OR requester ILIKE $${values.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // The DTO restricts sort/order. The explicit map also makes SQL interpolation safe for internal callers.
    const columns: Record<string, string> = { title: 'title', created_at: 'created_at', updated_at: 'updated_at', priority: "CASE priority WHEN 'Crítica' THEN 4 WHEN 'Alta' THEN 3 WHEN 'Media' THEN 2 ELSE 1 END" };
    const sort = columns[query.sort] || columns.created_at;
    return this.db.transaction(async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const count = await client.query(`SELECT count(*)::int AS total FROM support_requests ${where}`, values);
      const result = await client.query(`SELECT * FROM support_requests ${where} ORDER BY ${sort} ${query.order === 'asc' ? 'ASC' : 'DESC'}, id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, query.limit, (query.page - 1) * query.limit]);
      return { items: result.rows, total: count.rows[0].total, page: query.page, limit: query.limit };
    });
  }
  async detail(id: string) {
    const { rows } = await this.db.query<SupportRequest>('SELECT * FROM support_requests WHERE id=$1', [id]);
    if (!rows[0]) throw new NotFoundException('La solicitud no existe.');
    return rows[0];
  }
  async history(id: string) {
    await this.detail(id);
    return (await this.db.query('SELECT * FROM request_history WHERE request_id=$1 ORDER BY created_at DESC, id DESC', [id])).rows;
  }
  async create(data: RequestDto) {
    return this.db.transaction(async client => {
      const { rows } = await client.query('INSERT INTO support_requests(title,description,requester,category,priority) VALUES($1,$2,$3,$4,$5) RETURNING *', [data.title, data.description, data.requester, data.category, data.priority]);
      await client.query("INSERT INTO request_history(request_id,kind,to_status,actor,observation) VALUES($1,'Creación','Pendiente',$2,'Solicitud registrada')", [rows[0].id, data.requester]);
      return rows[0];
    });
  }
  async update(id: string, data: UpdateRequestDto) {
    return this.db.transaction(async client => {
      const old = (await client.query('SELECT * FROM support_requests WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!old) throw new NotFoundException('La solicitud no existe.');
      if (['Resuelta', 'Cancelada'].includes(old.status)) throw new ConflictException('Una solicitud cerrada no se puede editar.');
      const result = await client.query('UPDATE support_requests SET title=$2,description=$3,requester=$4,category=$5,priority=$6,updated_at=clock_timestamp() WHERE id=$1 RETURNING *', [id, data.title, data.description, data.requester, data.category, data.priority]);
      const changed = ['title', 'description', 'requester', 'category', 'priority'].filter(key => old[key] !== (data as any)[key]);
      await client.query("INSERT INTO request_history(request_id,kind,from_status,to_status,actor,observation,changes) VALUES($1,'Edición',$2,$2,$3,$4,$5)", [id, old.status, data.actor, changed.length ? `Campos modificados: ${changed.join(', ')}` : 'Guardado sin cambios', JSON.stringify(Object.fromEntries(changed.map(key => [key, { before: old[key], after: (data as any)[key] }])))]);
      return result.rows[0];
    });
  }
  async changeStatus(id: string, data: StatusDto) {
    return this.db.transaction(async client => {
      // Row lock prevents two simultaneous transitions from using an obsolete state.
      const current = (await client.query('SELECT * FROM support_requests WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!current) throw new NotFoundException('La solicitud no existe.');
      validateTransition(current.status, data.status, current.priority, data.observation);
      const result = await client.query('UPDATE support_requests SET status=$2,updated_at=clock_timestamp() WHERE id=$1 RETURNING *', [id, data.status]);
      await client.query("INSERT INTO request_history(request_id,kind,from_status,to_status,actor,observation) VALUES($1,'Estado',$2,$3,$4,$5)", [id, current.status, data.status, data.actor, data.observation || null]);
      return result.rows[0];
    });
  }
}
