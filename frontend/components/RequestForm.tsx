'use client';
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { categories, priorities, type Form } from '../lib/support';
type Props = {
    form: Form;
    setForm: Dispatch<SetStateAction<Form>>;
    mode: 'create' | 'edit';
    saving: boolean;
    imageProcessing: boolean;
    imagePicker: ReactNode;
    save: (event: FormEvent) => void;
    close: () => void;
};
export function RequestForm({ form, setForm, mode, saving, imageProcessing, imagePicker, save, close }: Props) { return <form onSubmit={save}><div className="form-grid"><label className="wide">Título<input required minLength={3} maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="¿En qué podemos ayudarte?"/></label><label className="wide">Descripción<textarea required minLength={10} maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe el problema, cuándo ocurre y qué has intentado."/></label><label className="wide">Solicitante<input required minLength={2} maxLength={100} value={form.requester} onChange={e => setForm({ ...form, requester: e.target.value })} placeholder="Nombre del usuario solicitante"/></label><label>Categoría<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(x => <option key={x}>{x}</option>)}</select></label><label>Prioridad<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{priorities.map(x => <option key={x}>{x}</option>)}</select></label>{mode === 'edit' && <label className="wide">Responsable de la edición<input required minLength={2} maxLength={100} value={form.actor} onChange={e => setForm({ ...form, actor: e.target.value })}/></label>}{imagePicker}</div><p className="hint">{mode === 'create' ? 'La solicitud se creará en estado Pendiente.' : 'La edición quedará registrada en el historial.'} Todos los campos son obligatorios.</p><div className="actions"><button type="button" className="secondary" disabled={saving} onClick={close}>Volver</button><button type="submit" className="primary" disabled={saving || imageProcessing}>{imageProcessing ? 'Procesando imagen…' : saving ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear solicitud'}</button></div></form>; }
