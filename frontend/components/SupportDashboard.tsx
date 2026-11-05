'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { RequestForm } from './RequestForm';
import { RequestFilters } from './RequestFilters';
import { RequestHistory } from './RequestHistory';
import { RequestList } from './RequestList';
import { ImagePicker, RequestImage } from './RequestImage';
import { api } from '../lib/api';
import { useApiConnection } from '../lib/use-api-connection';
import { Plus, Search, Ticket, ArrowUpRight, Clock3, CheckCheck, X, ChevronLeft, ChevronRight, RefreshCw, Layers, CircleDot } from 'lucide-react';
import { categories, priorities, statuses, transitions, initialForm, date, type RequestItem, type HistoryItem, type Page, type Form } from '../lib/support';
function Badge({ status }: {
    status: string;
}) { return <span className="badge" data-status={status}>{status}</span>; }
export default function SupportDashboard() {
    const connection = useApiConnection();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageRemoved, setImageRemoved] = useState(false);
    const [imageProcessing, setImageProcessing] = useState(false);
    const [result, setResult] = useState<Page>({ items: [], total: 0, page: 1, limit: 8 });
    const [stats, setStats] = useState<number[]>([0, 0, 0, 0]);
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [category, setCategory] = useState('');
    const [sort, setSort] = useState('created_at:desc');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<RequestItem | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [form, setForm] = useState<Form>(initialForm);
    const [actor, setActor] = useState('');
    const [nextStatus, setNextStatus] = useState('');
    const [observation, setObservation] = useState('');
    const [modalError, setModalError] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const listVersion = useRef(0);
    const detailVersion = useRef(0);
    useEffect(() => { const timer = setTimeout(() => { setSearch(q); setPage(1); }, 300); return () => clearTimeout(timer); }, [q]);
    const refreshStats = useCallback(async () => { if (connection.state !== 'ready')
        return; const totals = await Promise.all(['', ...['Pendiente', 'En progreso', 'Resuelta']].map(s => api<Page>(`/requests?limit=1${s ? `&status=${encodeURIComponent(s)}` : ''}`))); setStats(totals.map(x => x.total)); }, [connection.state]);
    const load = useCallback(async () => {
        if (connection.state !== 'ready')
            return;
        const version = ++listVersion.current;
        setLoading(true);
        setError('');
        const [sortKey, order] = sort.split(':');
        const params = new URLSearchParams({ page: String(page), limit: '8', sort: sortKey, order });
        if (search)
            params.set('q', search);
        if (status)
            params.set('status', status);
        if (priority)
            params.set('priority', priority);
        if (category)
            params.set('category', category);
        try {
            const data = await api<Page>(`/requests?${params}`);
            if (version === listVersion.current)
                setResult(data);
        }
        catch (e) {
            if (version === listVersion.current)
                setError((e as Error).message);
        }
        finally {
            if (version === listVersion.current)
                setLoading(false);
        }
    }, [page, search, status, priority, category, sort, connection.state]);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => { void refreshStats().catch(() => { }); }, [refreshStats]);
    useEffect(() => {
        if (!modal)
            return;
        const previous = document.activeElement as HTMLElement | null;
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !saving && !imageProcessing) {
                detailVersion.current++;
                setModal(null);
            }
            if (event.key === 'Tab') {
                const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,[tabindex="0"]');
                if (!elements?.length)
                    return;
                const first = elements[0], last = elements[elements.length - 1];
                if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                    event.preventDefault();
                    last.focus();
                }
                else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handler);
        return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', handler); previous?.focus(); };
    }, [modal, saving, imageProcessing]);
    function close() { if (!saving && !imageProcessing) {
        detailVersion.current++;
        setModal(null);
        setModalError('');
    } }
    async function openDetail(item: RequestItem) {
        setImageFile(null);
        setImageRemoved(false);
        const version = ++detailVersion.current;
        setSelected(item);
        setHistory([]);
        setModal('detail');
        setModalError('');
        setNextStatus('');
        setObservation('');
        setDetailLoading(true);
        try {
            const [fresh, events] = await Promise.all([api<RequestItem>(`/requests/${item.id}`), api<HistoryItem[]>(`/requests/${item.id}/history`)]);
            if (version === detailVersion.current) {
                setSelected(fresh);
                setHistory(events);
            }
        }
        catch (e) {
            if (version === detailVersion.current)
                setModalError((e as Error).message);
        }
        finally {
            if (version === detailVersion.current)
                setDetailLoading(false);
        }
    }
    function openCreate() { setImageFile(null); setImageRemoved(false); setForm({ ...initialForm, actor }); setSelected(null); setModalError(''); setModal('create'); }
    function openEdit() { if (!selected)
        return; setImageFile(null); setImageRemoved(false); setForm({ title: selected.title, description: selected.description, requester: selected.requester, category: selected.category, priority: selected.priority, actor }); setModalError(''); setModal('edit'); }
    async function persistImage(id: string, responsible: string) {
        if (imageFile) {
            const body = new FormData();
            body.append('image', imageFile);
            body.append('actor', responsible);
            await api<RequestItem>(`/requests/${id}/image`, { method: 'POST', body });
        }
        else if (imageRemoved) {
            await api<RequestItem>(`/requests/${id}/image`, { method: 'DELETE', body: JSON.stringify({ actor: responsible }) });
        }
    }
    async function save(event: FormEvent) {
        event.preventDefault();
        if (imageProcessing)
            return;
        setSaving(true);
        setModalError('');
        let saved: RequestItem | null = null;
        try {
            const payload = { title: form.title.trim(), description: form.description.trim(), requester: form.requester.trim(), category: form.category, priority: form.priority };
            if (payload.title.length < 3 || payload.description.length < 10 || payload.requester.length < 2)
                throw new Error('Revisa los campos: título mínimo 3 caracteres, descripción 10 y solicitante 2.');
            const editing = modal === 'edit';
            const responsible = editing ? form.actor.trim() : payload.requester;
            if (responsible.length < 2)
                throw new Error('Indica el responsable de la edición.');
            let body: BodyInit;
            if (!editing && imageFile) {
                const multipart = new FormData();
                for (const [key, value] of Object.entries(payload))
                    multipart.append(key, value);
                multipart.append('image', imageFile);
                body = multipart;
            }
            else
                body = JSON.stringify(editing ? { ...payload, actor: responsible } : payload);
            saved = await api<RequestItem>(editing ? `/requests/${selected!.id}` : '/requests', { method: editing ? 'PUT' : 'POST', body });
            setActor(responsible);
            if (editing)
                await persistImage(saved.id, responsible);
            setImageFile(null);
            setImageRemoved(false);
            setModal(null);
            setNotice(editing ? 'Solicitud actualizada.' : 'Solicitud creada correctamente.');
            await load();
            await refreshStats();
        }
        catch (e) {
            if (saved) {
                setSelected(saved);
                setModal('detail');
                setDetailLoading(false);
                setHistory(await api<HistoryItem[]>(`/requests/${saved.id}/history`).catch(() => []));
                setModalError('La solicitud quedó guardada, pero no se pudo guardar la imagen. Puedes reintentar aquí sin crear otra solicitud. ' + (e as Error).message);
                await load();
                await refreshStats().catch(() => { });
            }
            else
                setModalError((e as Error).message);
        }
        finally {
            setSaving(false);
        }
    }
    async function saveImage(event: FormEvent) {
        event.preventDefault();
        if (!selected || imageProcessing)
            return;
        setSaving(true);
        setModalError('');
        try {
            if (actor.trim().length < 2)
                throw new Error('Indica el responsable del cambio de imagen.');
            await persistImage(selected.id, actor.trim());
            const [fresh, events] = await Promise.all([api<RequestItem>(`/requests/${selected.id}`), api<HistoryItem[]>(`/requests/${selected.id}/history`)]);
            setSelected(fresh);
            setHistory(events);
            setImageFile(null);
            setImageRemoved(false);
            setNotice('Imagen actualizada.');
            await load();
        }
        catch (e) {
            setModalError((e as Error).message);
        }
        finally {
            setSaving(false);
        }
    }
    async function changeStatus(event: FormEvent) {
        event.preventDefault();
        if (!selected)
            return;
        setSaving(true);
        setModalError('');
        try {
            if (actor.trim().length < 2)
                throw new Error('Indica el usuario responsable del cambio.');
            if (selected.priority === 'Crítica' && nextStatus === 'Resuelta' && !observation.trim())
                throw new Error('Escribe una observación para resolver esta solicitud crítica.');
            const updated = await api<RequestItem>(`/requests/${selected.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus, actor: actor.trim(), observation: observation.trim() }) });
            setSelected(updated);
            setNextStatus('');
            setObservation('');
            setHistory(await api<HistoryItem[]>(`/requests/${selected.id}/history`));
            setNotice('Estado actualizado e historial registrado.');
            await load();
            await refreshStats();
        }
        catch (e) {
            setModalError((e as Error).message);
        }
        finally {
            setSaving(false);
        }
    }
    const displayError = connection.state === 'unavailable' ? 'No se pudo conectar con el servicio. Comprueba la conexión e inténtalo de nuevo.' : error;
    const imagePicker = <ImagePicker value={imageFile} existingUrl={selected?.image_url} removed={imageRemoved} disabled={saving} onChange={file => { setImageFile(file); if (file)
        setImageRemoved(false); }} onRemove={() => setImageRemoved(true)} onBusy={setImageProcessing}/>;
    const pages = Math.max(1, Math.ceil(result.total / result.limit));
    return <>
    <aside><div className="brand"><span className="brand-mark"><Layers size={22}/></span>mesa<span style={{ color: '#c2dc9c' }}>.</span></div><div className="aside-label">ESPACIO DE TRABAJO</div><div className="nav-item"><Ticket size={17}/> Solicitudes de soporte</div><div className="side-note"><CircleDot size={15}/><p style={{ marginTop: 10 }}>Cada solicitud, un paso<br />hacia una mejor solución.</p><p style={{ marginTop: 18, fontSize: 10 }}>MESA DE AYUDA · ITM</p></div></aside>
    <div className="workspace"><header className="topbar"><small>Organización / <strong style={{ color: 'var(--ink)' }}>Soporte tecnológico</strong></small><div className="avatar"><span>TI</span>Equipo de soporte</div></header>
    <main className="content"><div className="eyebrow">GESTIÓN INTERNA</div><div className="heading"><div><h1>Solicitudes de soporte</h1><p className="subtitle">Un lugar para registrar, organizar y resolver.</p></div><button className="primary" disabled={connection.state !== 'ready'} onClick={openCreate}><Plus size={17}/>Nueva solicitud</button></div>
    <div className="stats">{[{ label: 'Total de solicitudes', icon: Ticket, note: 'Todas las solicitudes registradas' }, { label: 'Pendientes', icon: Clock3, note: 'Esperando atención' }, { label: 'En progreso', icon: ArrowUpRight, note: 'Estamos trabajando en ellas' }, { label: 'Resueltas', icon: CheckCheck, note: 'Soluciones entregadas' }].map((s, i) => <div className="stat" key={s.label}><div className="stat-header">{s.label}<s.icon size={17}/></div><strong>{connection.state === 'ready' ? stats[i] : '—'}</strong><small>{s.note}</small></div>)}</div>
    {displayError && <div role="alert" className="error">{displayError} <button className="secondary" onClick={() => { if (connection.state === 'unavailable')
        connection.retry();
    else {
        void load();
        void refreshStats().catch(() => { });
    } }}>Reintentar</button></div>}
    {notice && <div role="status" className="success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{notice}<button aria-label="Cerrar notificación" className="icon-button" onClick={() => setNotice('')}><X size={14}/></button></div>}
    <section className="panel" aria-label="Listado de solicitudes"><div className="panel-title"><h2>Todas las solicitudes <span className="badge" style={{ marginLeft: 8 }}>{result.total}</span></h2><button className="icon-button" aria-label="Actualizar solicitudes" disabled={loading} onClick={() => { void load(); void refreshStats().catch(() => { }); }}><RefreshCw size={15}/></button></div>
    <RequestFilters query={q} onQuery={setQ} status={status} onStatus={value => { setStatus(value); setPage(1); }} priority={priority} onPriority={value => { setPriority(value); setPage(1); }} category={category} onCategory={value => { setCategory(value); setPage(1); }} sort={sort} onSort={value => { setSort(value); setPage(1); }}/>
    {connection.state === 'connecting' ? <div className="loading connection-loading" role="status"><span className="loading-pulse"/>Conectando con el servicio…<small>La primera conexión puede tardar unos segundos.</small></div> : connection.state === 'unavailable' ? <div className="empty">El listado estará disponible al recuperar la conexión.</div> : loading ? <div className="loading" role="status">Cargando solicitudes…</div> : result.items.length === 0 ? <div className="empty"><Ticket size={30} style={{ margin: '0 auto 12px' }}/><h3>{error ? 'No se pudo cargar el listado' : 'No hay solicitudes para mostrar'}</h3><p>{search || status || priority || category ? 'Prueba con otros filtros o términos de búsqueda.' : 'Registra una solicitud para empezar a trabajar.'}</p></div> : <RequestList items={result.items} onOpen={item => void openDetail(item)}/>}
    <div className="pagination"><span>{result.total ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, result.total)} de ${result.total} solicitudes` : '0 solicitudes'}</span><div><button className="secondary" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14}/></button><span>Página {page} de {pages}</span><button className="secondary" aria-label="Página siguiente" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}><ChevronRight size={14}/></button></div></div></section>
    <div className="footer"><span>Mesa de ayuda · Tecnología al servicio de tu equipo</span><span>Next.js + NestJS + Supabase</span></div></main></div>
    {modal && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget)
            close(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={dialogRef}><div className="modal-head"><h2 id="modal-title">{modal === 'create' ? 'Nueva solicitud' : modal === 'edit' ? 'Editar solicitud' : 'Detalle de solicitud'}</h2><button className="icon-button" aria-label="Cerrar ventana" disabled={saving || imageProcessing} onClick={close}><X size={20}/></button></div>{modalError && <div role="alert" className="error">{modalError}</div>}
    {modal !== 'detail' ? <RequestForm form={form} setForm={setForm} mode={modal} saving={saving} imageProcessing={imageProcessing} imagePicker={imagePicker} save={save} close={close}/> : selected && <><span className="ticket-id">#{selected.id.toUpperCase()}</span><h3 style={{ fontSize: 20, margin: '12px 0' }}>{selected.title}</h3><Badge status={selected.status}/><p className="detail-text">{selected.description}</p><RequestImage url={selected.image_url}/><div className="meta-grid"><div><small>Solicitante</small>{selected.requester}</div><div><small>Categoría</small>{selected.category}</div><div><small>Prioridad</small>{selected.priority}</div><div><small>Creada</small>{date(selected.created_at)}</div><div><small>Última actualización</small>{date(selected.updated_at)}</div></div>
    {!detailLoading && transitions[selected.status]?.length > 0 && <form className="image-editor" onSubmit={saveImage}><details open={Boolean(imageFile || imageRemoved)}><summary>Adjuntar, reemplazar o quitar imagen</summary>{imagePicker}<label>Responsable del cambio<input required minLength={2} maxLength={100} value={actor} onChange={e => setActor(e.target.value)} disabled={saving}/></label><div className="actions"><button className="primary" disabled={saving || imageProcessing || (!imageFile && !imageRemoved)}>{saving ? 'Guardando…' : 'Guardar imagen'}</button></div></details></form>}{detailLoading ? <p className="loading">Cargando detalle e historial…</p> : <><div className="actions">{transitions[selected.status]?.length > 0 && <button className="secondary" onClick={openEdit}>Editar solicitud</button>}</div>{transitions[selected.status]?.length > 0 ? <><h3 className="section-title">Actualizar estado</h3><form onSubmit={changeStatus}><div className="form-grid"><label>Nuevo estado<select required value={nextStatus} onChange={e => setNextStatus(e.target.value)}><option value="">Selecciona un estado</option>{transitions[selected.status].map(x => <option key={x}>{x}</option>)}</select></label><label>Usuario responsable<input required minLength={2} maxLength={100} value={actor} onChange={e => setActor(e.target.value)} placeholder="Tu nombre"/></label><label className="wide">Observación {selected.priority === 'Crítica' && nextStatus === 'Resuelta' ? '(obligatoria)' : '(opcional)'}<textarea maxLength={2000} required={selected.priority === 'Crítica' && nextStatus === 'Resuelta'} value={observation} onChange={e => setObservation(e.target.value)}/></label></div><div className="actions"><button className={nextStatus === 'Cancelada' ? 'danger' : 'primary'} disabled={saving || !nextStatus}>{saving ? 'Guardando…' : nextStatus === 'Cancelada' ? 'Confirmar cancelación' : 'Actualizar estado'}</button></div></form></> : <p className="hint">Esta solicitud está cerrada. Su detalle e historial se conservan para consulta.</p>}<RequestHistory items={history}/></>}
    </>}
    </div></div>}
  </>;
}
