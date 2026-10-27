'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { X, Loader2, Trash2 } from 'lucide-react'

export interface Practicante {
    id: number
    tipo: string | null
    perfil: string
    cantidad: number
    fecha_ingreso: string | null
    fecha_sale: string | null
    estado: string | null
    status: string | null
    observacion_general: string | null
}

type FormState = {
    tipo: string
    perfil: string
    cantidad: string
    fecha_ingreso: string
    fecha_sale: string
    estado: string
    status: string
    observacion_general: string
}

function toForm(p: Practicante | null): FormState {
    return {
        tipo: p?.tipo || '',
        perfil: p?.perfil || '',
        cantidad: p?.cantidad != null ? String(p.cantidad) : '1',
        fecha_ingreso: p?.fecha_ingreso || '',
        fecha_sale: p?.fecha_sale || '',
        estado: p?.estado || '',
        status: p?.status || '',
        observacion_general: p?.observacion_general || '',
    }
}

export function PracticanteModal({
    practicante,
    onClose,
    onSaved,
    onDeleted,
}: {
    practicante: Practicante | null // null = creando uno nuevo
    onClose: () => void
    onSaved: () => void
    onDeleted: () => void
}) {
    const supabase = createClient()
    const esNuevo = practicante === null
    const [editando, setEditando] = useState(esNuevo)
    const [form, setForm] = useState<FormState>(toForm(practicante))
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmAction, setConfirmAction] = useState<'guardar' | 'crear' | 'eliminar' | null>(null)

    useEffect(() => {
        setForm(toForm(practicante))
        setEditando(practicante === null)
    }, [practicante])

    const set = (field: keyof FormState, value: string) => setForm(prev => ({ ...prev, [field]: value }))

    const validar = (): string | null => {
        if (!form.perfil.trim()) return 'El perfil es obligatorio'
        return null
    }

    const buildPayload = () => ({
        tipo: form.tipo.trim() || null,
        perfil: form.perfil.trim(),
        cantidad: form.cantidad.trim() ? parseInt(form.cantidad, 10) : 1,
        fecha_ingreso: form.fecha_ingreso.trim() || null,
        fecha_sale: form.fecha_sale.trim() || null,
        estado: form.estado.trim() || null,
        status: form.status.trim() || null,
        observacion_general: form.observacion_general.trim() || null,
    })

    const handleGuardarClick = () => {
        const err = validar()
        if (err) { toast.error(err); return }
        setConfirmAction(esNuevo ? 'crear' : 'guardar')
    }

    const confirmarGuardar = async () => {
        setSaving(true)
        try {
            const payload = buildPayload()
            if (esNuevo) {
                const { error } = await (supabase.from('seleccion_practicantes' as any) as any).insert(payload)
                if (error) throw error
                toast.success('Practicante creado correctamente')
            } else {
                const { error } = await (supabase.from('seleccion_practicantes' as any) as any)
                    .update(payload)
                    .eq('id', practicante!.id)
                if (error) throw error
                toast.success('Practicante actualizado correctamente')
            }
            onSaved()
        } catch (err) {
            console.error('Error guardando practicante:', err)
            toast.error('No se pudo guardar el practicante')
        } finally {
            setSaving(false)
            setConfirmAction(null)
        }
    }

    const confirmarEliminar = async () => {
        if (!practicante) return
        setDeleting(true)
        try {
            const { error } = await (supabase.from('seleccion_practicantes' as any) as any)
                .delete()
                .eq('id', practicante.id)
            if (error) throw error
            toast.success('Practicante eliminado correctamente')
            onDeleted()
        } catch (err) {
            console.error('Error eliminando practicante:', err)
            toast.error('No se pudo eliminar el practicante')
        } finally {
            setDeleting(false)
            setConfirmAction(null)
        }
    }

    const fieldClass = "w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium disabled:opacity-70 disabled:cursor-default"
    const areaClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium resize-none disabled:opacity-70 disabled:cursor-default"
    const labelClass = "text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1"

    return (
        <>
            <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" onClick={onClose}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div
                    className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
                        <h2 className="font-black text-lg text-slate-800">
                            {esNuevo ? 'Nuevo practicante' : editando ? 'Editar practicante' : 'Detalle del practicante'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Perfil</label>
                                <input
                                    type="text"
                                    value={form.perfil}
                                    disabled={!editando}
                                    onChange={(e) => set('perfil', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Ej: Contabilidad, Diseño I+D+I..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Tipo de vinculación</label>
                                <input
                                    type="text"
                                    value={form.tipo}
                                    disabled={!editando}
                                    onChange={(e) => set('tipo', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Fijo, Activo, Técnico..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.cantidad}
                                    disabled={!editando}
                                    onChange={(e) => set('cantidad', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Ingresa</label>
                                <input
                                    type="text"
                                    value={form.fecha_ingreso}
                                    disabled={!editando}
                                    onChange={(e) => set('fecha_ingreso', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Ej: 06 de julio"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Sale</label>
                                <input
                                    type="text"
                                    value={form.fecha_sale}
                                    disabled={!editando}
                                    onChange={(e) => set('fecha_sale', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Ej: 05 de enero"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Estado</label>
                                <input
                                    type="text"
                                    value={form.estado}
                                    disabled={!editando}
                                    onChange={(e) => set('estado', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Activo, Recientemente salió..."
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Status / seguimiento</label>
                                <textarea
                                    value={form.status}
                                    disabled={!editando}
                                    onChange={(e) => set('status', e.target.value)}
                                    rows={2}
                                    className={areaClass}
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Observación general</label>
                                <textarea
                                    value={form.observacion_general}
                                    disabled={!editando}
                                    onChange={(e) => set('observacion_general', e.target.value)}
                                    rows={2}
                                    className={areaClass}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 rounded-b-3xl">
                        {!esNuevo && !editando && (
                            <button
                                onClick={() => setConfirmAction('eliminar')}
                                disabled={deleting}
                                className="h-11 px-4 flex items-center gap-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all text-sm font-bold disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                                Eliminar
                            </button>
                        )}
                        <div className="flex-1" />
                        {editando ? (
                            <>
                                {!esNuevo && (
                                    <button
                                        onClick={() => { setForm(toForm(practicante)); setEditando(false) }}
                                        className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={handleGuardarClick}
                                    disabled={saving}
                                    className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {esNuevo ? 'Crear practicante' : 'Guardar cambios'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditando(true)}
                                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-100 transition-all"
                            >
                                Editar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmAction === 'guardar'}
                variant="info"
                title="¿Guardar los cambios?"
                description={`Se actualizará el practicante "${form.perfil}" con la información editada.`}
                confirmLabel="Guardar"
                onConfirm={confirmarGuardar}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                isOpen={confirmAction === 'crear'}
                variant="info"
                title="¿Crear este practicante?"
                description={`Se añadirá "${form.perfil || 'este practicante'}" al seguimiento de Practicantes.`}
                confirmLabel="Crear"
                onConfirm={confirmarGuardar}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                isOpen={confirmAction === 'eliminar'}
                variant="danger"
                title="¿Eliminar este practicante?"
                description={`Se eliminará "${practicante?.perfil}" de forma permanente. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                onConfirm={confirmarEliminar}
                onCancel={() => setConfirmAction(null)}
            />
        </>
    )
}
