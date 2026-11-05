import { date, type HistoryItem } from '../lib/support';
const fields: Record<string, string> = { title: 'Título', description: 'Descripción', requester: 'Solicitante', category: 'Categoría', priority: 'Prioridad', image_path: 'Imagen de referencia' };
function value(field: string, data: unknown) { if (field === 'image_path')
    return data ? 'Imagen adjunta' : 'Sin imagen'; return data == null ? 'Sin valor' : String(data); }
export function RequestHistory({ items }: {
    items: HistoryItem[];
}) { return <section><h3 className="section-title">Historial de cambios</h3><div className="history">{items.map(item => <article className="history-item" key={item.id}><strong>{item.kind === 'Creación' ? 'Solicitud creada' : item.kind === 'Edición' ? 'Solicitud actualizada' : `${item.from_status} → ${item.to_status}`}</strong><small>{date(item.created_at)} · {item.actor}</small>{item.observation && <p>{item.observation}</p>}{item.changes && Object.keys(item.changes).length > 0 && <details><summary>Ver cambios realizados</summary><dl className="history-changes">{Object.entries(item.changes).map(([field, change]) => <div key={field}><dt>{fields[field] || field}</dt><dd><span>{value(field, change.before)}</span><span aria-hidden="true"> → </span><strong>{value(field, change.after)}</strong></dd></div>)}</dl></details>}</article>)}</div></section>; }
