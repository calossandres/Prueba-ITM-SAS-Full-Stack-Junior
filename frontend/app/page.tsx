'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Search, Ticket, ArrowUpRight, Clock3, CheckCheck, X, ChevronLeft, ChevronRight, RefreshCw, Layers, CircleDot } from 'lucide-react';
const categories = ['Hardware','Software','Red','Accesos','Otros'];
const priorities = ['Baja','Media','Alta','Crítica'];
const statuses = ['Pendiente','En progreso','Resuelta','Cancelada'];
const transitions: Record<string,string[]> = { Pendiente: ['En progreso','Cancelada'], 'En progreso':['Resuelta'], Resuelta:[], Cancelada:[] };
type RequestItem = { id:string; title:string; description:string; requester:string; category:string; priority:string; status:string; created_at:string; updated_at:string };
type HistoryItem = { id:string; kind:string; from_status:string|null; to_status:string; actor:string; observation:string|null; created_at:string; changes:Record<string,{before:unknown;after:unknown}>|null };
type Page = { items:RequestItem[]; total:number; page:number; limit:number };
type Form = { title:string; description:string; requester:string; category:string; priority:string; actor:string };
const initialForm:Form = { title:'', description:'', requester:'', category:'Software', priority:'Media', actor:'' };
const date = (value:string) => new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
async function api<T>(path:string, options?:RequestInit):Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers:{ 'Content-Type':'application/json', ...options?.headers }, cache:'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(data?.message) ? data.message.join('. ') : (data?.message || 'No se pudo completar la operación. Verifica que la API y Supabase estén disponibles.'));
  return data as T;
}
function Badge({status}:{status:string}) { return <span className="badge" data-status={status}>{status}</span>; }
export default function Home() {
  const [result,setResult] = useState<Page>({items:[],total:0,page:1,limit:8});
  const [stats,setStats] = useState<number[]>([0,0,0,0]);
  const [q,setQ] = useState(''); const [search,setSearch] = useState('');
  const [status,setStatus] = useState(''); const [priority,setPriority] = useState(''); const [category,setCategory] = useState('');
  const [sort,setSort] = useState('created_at:desc'); const [page,setPage] = useState(1);
  const [loading,setLoading] = useState(true); const [saving,setSaving] = useState(false); const [error,setError] = useState(''); const [notice,setNotice] = useState('');
  const [modal,setModal] = useState<'create'|'edit'|'detail'|null>(null);
  const [selected,setSelected] = useState<RequestItem|null>(null); const [history,setHistory] = useState<HistoryItem[]>([]);
  const [form,setForm] = useState<Form>(initialForm); const [actor,setActor] = useState(''); const [nextStatus,setNextStatus] = useState(''); const [observation,setObservation] = useState('');
  const [modalError,setModalError] = useState(''); const [detailLoading,setDetailLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null); const listVersion = useRef(0); const detailVersion = useRef(0);
  useEffect(() => { const timer=setTimeout(()=>{setSearch(q);setPage(1);},300); return ()=>clearTimeout(timer); },[q]);
  const refreshStats = useCallback(async()=>{ const totals=await Promise.all(['',...['Pendiente','En progreso','Resuelta']].map(s=>api<Page>(`/requests?limit=1${s?`&status=${encodeURIComponent(s)}`:''}`))); setStats(totals.map(x=>x.total)); },[]);
  const load = useCallback(async()=>{
    const version=++listVersion.current; setLoading(true); setError('');
    const [sortKey,order]=sort.split(':'); const params=new URLSearchParams({page:String(page),limit:'8',sort:sortKey,order});
    if(search)params.set('q',search); if(status)params.set('status',status); if(priority)params.set('priority',priority); if(category)params.set('category',category);
    try { const data=await api<Page>(`/requests?${params}`); if(version===listVersion.current)setResult(data); }
    catch(e){if(version===listVersion.current)setError((e as Error).message);}
    finally{if(version===listVersion.current)setLoading(false);}
  },[page,search,status,priority,category,sort]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{void refreshStats().catch(()=>{});},[refreshStats]);
  useEffect(()=>{
    if(!modal)return; const previous=document.activeElement as HTMLElement|null; const oldOverflow=document.body.style.overflow; document.body.style.overflow='hidden'; dialogRef.current?.focus();
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!saving){detailVersion.current++;setModal(null);}
      if(event.key==='Tab'){
        const elements=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,[tabindex="0"]');
        if(!elements?.length)return; const first=elements[0],last=elements[elements.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialogRef.current)){event.preventDefault();first.focus();}
      }
    }; document.addEventListener('keydown',handler);return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',handler);previous?.focus();};
  },[modal,saving]);
  function close(){if(!saving){detailVersion.current++;setModal(null);setModalError('');}}
  async function openDetail(item:RequestItem){
    const version=++detailVersion.current;setSelected(item);setHistory([]);setModal('detail');setModalError('');setNextStatus('');setObservation('');setDetailLoading(true);
    try{const [fresh,events]=await Promise.all([api<RequestItem>(`/requests/${item.id}`),api<HistoryItem[]>(`/requests/${item.id}/history`)]);if(version===detailVersion.current){setSelected(fresh);setHistory(events);}}
    catch(e){if(version===detailVersion.current)setModalError((e as Error).message);}
    finally{if(version===detailVersion.current)setDetailLoading(false);}
  }
  function openCreate(){setForm({...initialForm,actor});setSelected(null);setModalError('');setModal('create');}
  function openEdit(){if(!selected)return;setForm({title:selected.title,description:selected.description,requester:selected.requester,category:selected.category,priority:selected.priority,actor});setModalError('');setModal('edit');}
  async function save(event:FormEvent){
    event.preventDefault();setSaving(true);setModalError('');
    try{
      const payload={title:form.title.trim(),description:form.description.trim(),requester:form.requester.trim(),category:form.category,priority:form.priority};
      if(payload.title.length<3||payload.description.length<10||payload.requester.length<2)throw new Error('Revisa los campos: título mínimo 3 caracteres, descripción 10 y solicitante 2.');
      if(modal==='edit'&&form.actor.trim().length<2)throw new Error('Indica el responsable de la edición.');
      await api<RequestItem>(modal==='edit'?`/requests/${selected!.id}`:'/requests',{method:modal==='edit'?'PUT':'POST',body:JSON.stringify(modal==='edit'?{...payload,actor:form.actor.trim()}:payload)});
      if(modal==='edit')setActor(form.actor.trim());setModal(null);setNotice(modal==='edit'?'Solicitud actualizada.':'Solicitud creada correctamente.');await load();await refreshStats();
    }catch(e){setModalError((e as Error).message);}finally{setSaving(false);}
  }
  async function changeStatus(event:FormEvent){
    event.preventDefault();if(!selected)return;setSaving(true);setModalError('');
    try{
      if(actor.trim().length<2)throw new Error('Indica el usuario responsable del cambio.');
      if(selected.priority==='Crítica'&&nextStatus==='Resuelta'&&!observation.trim())throw new Error('Escribe una observación para resolver esta solicitud crítica.');
      const updated=await api<RequestItem>(`/requests/${selected.id}/status`,{method:'PATCH',body:JSON.stringify({status:nextStatus,actor:actor.trim(),observation:observation.trim()})});
      setSelected(updated);setNextStatus('');setObservation('');setHistory(await api<HistoryItem[]>(`/requests/${selected.id}/history`));setNotice('Estado actualizado e historial registrado.');await load();await refreshStats();
    }catch(e){setModalError((e as Error).message);}finally{setSaving(false);}
  }
  const pages=Math.max(1,Math.ceil(result.total/result.limit));
  return <>
    <aside><div className="brand"><span className="brand-mark"><Layers size={22}/></span>mesa<span style={{color:'#c2dc9c'}}>.</span></div><div className="aside-label">ESPACIO DE TRABAJO</div><div className="nav-item"><Ticket size={17}/> Solicitudes de soporte</div><div className="side-note"><CircleDot size={15}/><p style={{marginTop:10}}>Cada solicitud, un paso<br/>hacia una mejor solución.</p><p style={{marginTop:18,fontSize:10}}>MESA DE AYUDA · ITM</p></div></aside>
    <div className="workspace"><header className="topbar"><small>Organización / <strong style={{color:'var(--ink)'}}>Soporte tecnológico</strong></small><div className="avatar"><span>TI</span>Equipo de soporte</div></header>
    <main className="content"><div className="eyebrow">GESTIÓN INTERNA</div><div className="heading"><div><h1>Solicitudes de soporte</h1><p className="subtitle">Un lugar para registrar, organizar y resolver.</p></div><button className="primary" onClick={openCreate}><Plus size={17}/>Nueva solicitud</button></div>
    <div className="stats">{[{label:'Total de solicitudes',icon:Ticket,note:'Todas las solicitudes registradas'},{label:'Pendientes',icon:Clock3,note:'Esperando atención'},{label:'En progreso',icon:ArrowUpRight,note:'Estamos trabajando en ellas'},{label:'Resueltas',icon:CheckCheck,note:'Soluciones entregadas'}].map((s,i)=><div className="stat" key={s.label}><div className="stat-header">{s.label}<s.icon size={17}/></div><strong>{stats[i]}</strong><small>{s.note}</small></div>)}</div>
    {error&&<div role="alert" className="error">{error} <button className="secondary" onClick={()=>{void load();void refreshStats().catch(()=>{});}}>Reintentar</button></div>}
    {notice&&<div role="status" className="success" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{notice}<button aria-label="Cerrar notificación" className="icon-button" onClick={()=>setNotice('')}><X size={14}/></button></div>}
    <section className="panel" aria-label="Listado de solicitudes"><div className="panel-title"><h2>Todas las solicitudes <span className="badge" style={{marginLeft:8}}>{result.total}</span></h2><button className="icon-button" aria-label="Actualizar solicitudes" disabled={loading} onClick={()=>{void load();void refreshStats().catch(()=>{});}}><RefreshCw size={15}/></button></div>
    <div className="filters"><div className="search"><Search size={16}/><input aria-label="Buscar solicitudes" placeholder="Buscar por título, descripción o solicitante…" value={q} maxLength={120} onChange={e=>setQ(e.target.value)}/></div><select aria-label="Filtrar por estado" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Todos los estados</option>{statuses.map(x=><option key={x}>{x}</option>)}</select><select aria-label="Filtrar por prioridad" value={priority} onChange={e=>{setPriority(e.target.value);setPage(1);}}><option value="">Toda prioridad</option>{priorities.map(x=><option key={x}>{x}</option>)}</select><select aria-label="Filtrar por categoría" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option value="">Toda categoría</option>{categories.map(x=><option key={x}>{x}</option>)}</select><select aria-label="Ordenar solicitudes" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="created_at:desc">Más recientes</option><option value="created_at:asc">Más antiguas</option><option value="updated_at:desc">Actualizadas recientemente</option><option value="priority:desc">Mayor prioridad</option><option value="title:asc">Título: A a Z</option></select></div>
    {loading?<div className="loading" role="status">Cargando solicitudes…</div>:result.items.length===0?<div className="empty"><Ticket size={30} style={{margin:'0 auto 12px'}}/><h3>{error?'No se pudo cargar el listado':'No hay solicitudes para mostrar'}</h3><p>{search||status||priority||category?'Prueba con otros filtros o términos de búsqueda.':'Registra una solicitud para empezar a trabajar.'}</p></div>:<div className="table-wrap"><table><thead><tr><th>Solicitud</th><th>Solicitante</th><th>Estado</th><th>Prioridad</th><th>Categoría</th><th>Creación</th></tr></thead><tbody>{result.items.map(item=><tr key={item.id}><td><span className="ticket-id">#{item.id.slice(0,8).toUpperCase()}</span><button className="ticket-title" onClick={()=>void openDetail(item)}>{item.title}</button></td><td>{item.requester}</td><td><Badge status={item.status}/></td><td><span className="priority"><i className="dot" data-priority={item.priority}/>{item.priority}</span></td><td>{item.category}</td><td style={{color:'var(--muted)',fontSize:11}}>{date(item.created_at)}</td></tr>)}</tbody></table></div>}
    <div className="pagination"><span>{result.total?`${(page-1)*8+1}–${Math.min(page*8,result.total)} de ${result.total} solicitudes`:'0 solicitudes'}</span><div><button className="secondary" aria-label="Página anterior" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={14}/></button><span>Página {page} de {pages}</span><button className="secondary" aria-label="Página siguiente" disabled={page>=pages||loading} onClick={()=>setPage(p=>p+1)}><ChevronRight size={14}/></button></div></div></section>
    <div className="footer"><span>Mesa de ayuda · Tecnología al servicio de tu equipo</span><span>Next.js + NestJS + Supabase</span></div></main></div>
    {modal&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={dialogRef}><div className="modal-head"><h2 id="modal-title">{modal==='create'?'Nueva solicitud':modal==='edit'?'Editar solicitud':'Detalle de solicitud'}</h2><button className="icon-button" aria-label="Cerrar ventana" disabled={saving} onClick={close}><X size={20}/></button></div>{modalError&&<div role="alert" className="error">{modalError}</div>}
    {modal!=='detail'?<form onSubmit={save}><div className="form-grid"><label className="wide">Título<input required minLength={3} maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="¿En qué podemos ayudarte?"/></label><label className="wide">Descripción<textarea required minLength={10} maxLength={5000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe el problema, cuándo ocurre y qué has intentado."/></label><label className="wide">Solicitante<input required minLength={2} maxLength={100} value={form.requester} onChange={e=>setForm({...form,requester:e.target.value})} placeholder="Nombre del usuario solicitante"/></label><label>Categoría<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>Prioridad<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{priorities.map(x=><option key={x}>{x}</option>)}</select></label>{modal==='edit'&&<label className="wide">Responsable de la edición<input required minLength={2} maxLength={100} value={form.actor} onChange={e=>setForm({...form,actor:e.target.value})}/></label>}</div><p className="hint">{modal==='create'?'La solicitud se creará en estado Pendiente.':'La edición quedará registrada en el historial.'} Todos los campos son obligatorios.</p><div className="actions"><button type="button" className="secondary" disabled={saving} onClick={close}>Volver</button><button type="submit" className="primary" disabled={saving}>{saving?'Guardando…':modal==='edit'?'Guardar cambios':'Crear solicitud'}</button></div></form>:selected&&<><span className="ticket-id">#{selected.id.toUpperCase()}</span><h3 style={{fontSize:20,margin:'12px 0'}}>{selected.title}</h3><Badge status={selected.status}/><p className="detail-text">{selected.description}</p><div className="meta-grid"><div><small>Solicitante</small>{selected.requester}</div><div><small>Categoría</small>{selected.category}</div><div><small>Prioridad</small>{selected.priority}</div><div><small>Creada</small>{date(selected.created_at)}</div><div><small>Última actualización</small>{date(selected.updated_at)}</div></div>
    {detailLoading?<p className="loading">Cargando detalle e historial…</p>:<><div className="actions">{transitions[selected.status]?.length>0&&<button className="secondary" onClick={openEdit}>Editar solicitud</button>}</div>{transitions[selected.status]?.length>0?<><h3 className="section-title">Actualizar estado</h3><form onSubmit={changeStatus}><div className="form-grid"><label>Nuevo estado<select required value={nextStatus} onChange={e=>setNextStatus(e.target.value)}><option value="">Selecciona un estado</option>{transitions[selected.status].map(x=><option key={x}>{x}</option>)}</select></label><label>Usuario responsable<input required minLength={2} maxLength={100} value={actor} onChange={e=>setActor(e.target.value)} placeholder="Tu nombre"/></label><label className="wide">Observación {selected.priority==='Crítica'&&nextStatus==='Resuelta'?'(obligatoria)':'(opcional)'}<textarea maxLength={2000} required={selected.priority==='Crítica'&&nextStatus==='Resuelta'} value={observation} onChange={e=>setObservation(e.target.value)}/></label></div><div className="actions"><button className={nextStatus==='Cancelada'?'danger':'primary'} disabled={saving||!nextStatus}>{saving?'Guardando…':nextStatus==='Cancelada'?'Confirmar cancelación':'Actualizar estado'}</button></div></form></>:<p className="hint">Esta solicitud está cerrada. Su detalle e historial se conservan para consulta.</p>}<h3 className="section-title">Historial de cambios</h3><div className="history">{history.map(item=><div className="history-item" key={item.id}><strong>{item.kind}{item.kind==='Estado'?`: ${item.from_status} → ${item.to_status}`:''}</strong><small>{date(item.created_at)} · {item.actor}</small>{item.observation&&<p>{item.observation}</p>}{item.changes&&<details><summary>Ver cambios realizados</summary><pre>{JSON.stringify(item.changes,null,2)}</pre></details>}</div>)}</div></>}
    </>}
    </div></div>}
  </>;
}
