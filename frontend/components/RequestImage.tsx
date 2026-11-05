'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { prepareImage } from '../lib/image-upload';
type Props = {
    value: File | null;
    existingUrl?: string | null;
    removed?: boolean;
    disabled?: boolean;
    onChange: (file: File | null) => void;
    onRemove: () => void;
    onBusy: (busy: boolean) => void;
};
export function ImagePicker({ value, existingUrl, removed, disabled, onChange, onRemove, onBusy }: Props) {
    const [preview, setPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    useEffect(() => { if (!value) {
        setPreview(null);
        return;
    } const url = URL.createObjectURL(value); setPreview(url); return () => URL.revokeObjectURL(url); }, [value]);
    useEffect(() => () => { generation.current++; }, []);
    const url = preview || (!removed ? existingUrl : null);
    return <div className="attachment-picker wide"><div className="attachment-heading"><strong>Imagen de referencia <span>(opcional)</span></strong>{url && <button type="button" className="secondary" disabled={disabled || busy} onClick={() => { onChange(null); onRemove(); setError(''); }}><Trash2 size={14}/>Quitar imagen</button>}</div>
    {url && <img className="attachment-preview" src={url} alt="Vista previa de la imagen adjunta"/>}
    <label className={`attachment-input ${busy ? 'is-busy' : ''}`}><ImagePlus size={20}/><span>{busy ? 'Optimizando imagen…' : url ? 'Reemplazar imagen' : 'Seleccionar una imagen'}<small>JPG, PNG o WebP · Original de hasta 500 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} aria-label="Seleccionar imagen de referencia" onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file)
                return;
            const version = ++generation.current;
            setBusy(true);
            onBusy(true);
            setError('');
            try {
                const optimized = await prepareImage(file);
                if (version === generation.current)
                    onChange(optimized);
            }
            catch (e) {
                if (version === generation.current)
                    setError((e as Error).message);
            }
            finally {
                if (version === generation.current) {
                    setBusy(false);
                    onBusy(false);
                }
            }
        }}/></label><p className="hint">La imagen se optimiza antes de subirla. Evita incluir contraseñas o datos personales.</p>{error && <p className="attachment-error" role="alert">{error}</p>}
  </div>;
}
export function RequestImage({ url }: {
    url?: string | null;
}) {
    if (!url)
        return null;
    return <section className="request-image"><h3 className="section-title">Imagen de referencia</h3><a href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir imagen de referencia ampliada en otra pestaña"><img src={url} alt="Imagen adjunta a la solicitud" loading="lazy"/><span>Ver imagen ampliada ↗</span></a></section>;
}
