'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { prepareImage } from '../lib/image-upload';
import { date, type RequestItem } from '../lib/support';
type Props = {
  value: File | null;
  title?: string;
  description?: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onBusy: (busy: boolean) => void;
};
export function ImagePicker({ value, title = 'Imagen del problema', description = 'Una vez creada la solicitud, esta imagen se conservará sin cambios.', disabled, onChange, onBusy }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => { if (!value) { setPreview(null); return; } const url = URL.createObjectURL(value); setPreview(url); return () => URL.revokeObjectURL(url); }, [value]);
  useEffect(() => () => { generation.current++; }, []);
  return <div className="attachment-picker wide"><div className="attachment-heading"><strong>{title} <span>(opcional)</span></strong>{preview && <button type="button" className="secondary" disabled={disabled || busy} onClick={() => { onChange(null); setError(''); }}><Trash2 size={14}/>Quitar selección</button>}</div>
    {preview && <img className="attachment-preview" src={preview} alt={`Vista previa: ${title.toLowerCase()}`}/>}
    <label className={`attachment-input ${busy ? 'is-busy' : ''}`}><ImagePlus size={20}/><span>{busy ? 'Optimizando imagen…' : preview ? 'Cambiar selección' : 'Seleccionar una imagen'}<small>JPG, PNG o WebP · Original de hasta 500 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} aria-label={`Seleccionar ${title.toLowerCase()}`} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const version = ++generation.current; setBusy(true); onBusy(true); setError('');
      try { const optimized = await prepareImage(file); if (version === generation.current) onChange(optimized); }
      catch (e) { if (version === generation.current) setError((e as Error).message); }
      finally { if (version === generation.current) { setBusy(false); onBusy(false); } }
    }}/></label><p className="hint">{description} La imagen se optimiza antes de subirla; evita incluir datos personales.</p>{error && <p className="attachment-error" role="alert">{error}</p>}
  </div>;
}
function EvidenceImage({ url, title, caption }: { url?: string | null; title: string; caption?: string }) {
  return <section className="request-image"><h3 className="section-title">{title}</h3>{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${title.toLowerCase()} ampliada en otra pestaña`}><img src={url} alt={title} loading="lazy"/><span>Ver imagen ampliada ↗</span></a> : <p className="hint evidence-empty">No se adjuntó una imagen.</p>}{caption && <p className="hint">{caption}</p>}</section>;
}
export function RequestEvidence({ request }: { request: RequestItem }) {
  if (!request.image_path && !request.solution_image_path) return null;
  const solutionCaption = request.solution_image_actor && request.solution_image_at ? `${request.solution_image_actor} · ${date(request.solution_image_at)}` : undefined;
  return <div className="evidence-grid"><EvidenceImage url={request.image_url} title="Imagen del problema" caption={request.image_path ? 'Evidencia original conservada.' : undefined}/>{request.status === 'Resuelta' || request.solution_image_path ? <EvidenceImage url={request.solution_image_url} title="Imagen de la solución" caption={solutionCaption}/> : null}</div>;
}
