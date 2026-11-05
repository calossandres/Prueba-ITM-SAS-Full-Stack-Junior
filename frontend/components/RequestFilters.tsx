import { Search } from 'lucide-react';
import { categories, priorities, statuses } from '../lib/support';
type Props = {
    query: string;
    onQuery: (value: string) => void;
    status: string;
    onStatus: (value: string) => void;
    priority: string;
    onPriority: (value: string) => void;
    category: string;
    onCategory: (value: string) => void;
    sort: string;
    onSort: (value: string) => void;
};
export function RequestFilters(p: Props) { return <div className="filters"><label className="search"><span>Buscar solicitud</span><div><Search size={16}/><input placeholder="Título, descripción o solicitante" value={p.query} maxLength={120} onChange={e => p.onQuery(e.target.value)}/></div></label><label>Estado<select value={p.status} onChange={e => p.onStatus(e.target.value)}><option value="">Todos los estados</option>{statuses.map(x => <option key={x}>{x}</option>)}</select></label><label>Prioridad<select value={p.priority} onChange={e => p.onPriority(e.target.value)}><option value="">Toda prioridad</option>{priorities.map(x => <option key={x}>{x}</option>)}</select></label><label>Categoría<select value={p.category} onChange={e => p.onCategory(e.target.value)}><option value="">Toda categoría</option>{categories.map(x => <option key={x}>{x}</option>)}</select></label><label>Ordenar por<select value={p.sort} onChange={e => p.onSort(e.target.value)}><option value="created_at:desc">Más recientes</option><option value="created_at:asc">Más antiguas</option><option value="updated_at:desc">Última actualización</option><option value="priority:desc">Mayor prioridad</option><option value="title:asc">Título: A a Z</option></select></label></div>; }
