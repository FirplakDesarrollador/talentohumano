'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { X, Loader2, Trash2 } from 'lucide-react'

export interface Vacante {
    id: number
    estado: 'ACTIVA' | 'CERRADA' | 'CANCELADA'
    fecha_solicitud: string
    fecha_real_ingreso: string | null
    ans: number | null
    cargo: string
    planta: string | null
    area: string | null
    nivel_cargo: string | null
    origen_solicitud: string | null
    numero_personas_solicitada: number
    solicita: string | null
    solicitud_personal_id: number | null
}

const ESTADOS: Vacante['estado'][] = ['ACTIVA', 'CERRADA', 'CANCELADA']

type FormState = {
    estado: Vacante['estado']
    fecha_solicitud: string
    fecha_real_ingreso: string
    ans: string
    cargo: string
    planta: string
    area: string
    nivel_cargo: string
    origen_solicitud: string
    numero_personas_solicitada: string
    solicita: string
}

function toForm(v: Vacante | null): FormState {
    return {
        estado: v?.estado || 'ACTIVA',
        fecha_solicitud: v?.fecha_solicitud || '',
        fecha_real_ingreso: v?.fecha_real_ingreso || '',
        ans: v?.ans != null ? String(v.ans) : '',
        cargo: v?.cargo || '',
        planta: v?.planta || '',
        area: v?.area || '',
        nivel_cargo: v?.nivel_cargo || '',
        origen_solicitud: v?.origen_solicitud || '',
        numero_personas_solicitada: v?.numero_personas_solicitada != null ? String(v.numero_personas_solicitada) : '1',
        solicita: v?.solicita || '',
    }
}

export function VacanteModal({
    vacante,
    onClose,
    onSaved,
    onDeleted,
}: {
    vacante: Vacante | null // null = creando una nueva
    onClose: () => void
    onSaved: () => void
    onDeleted: () => void
}) {
    const supabase = createClient()
    const esNueva = vacante === null
    const [editando, setEditando] = useState(esNueva)
    const [form, setForm] = useState<FormState>(toForm(vacante))
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmAction, setConfirmAction] = useState<'guardar' | 'crear' | 'eliminar' | null>(null)

    useEffect(() => {
        setForm(toForm(vacante))
        setEditando(vacante === null)
    }, [vacante])

    const set = (field: keyof FormState, value: string) => setForm(prev => ({ ...prev, [field]: value }))

    const validar = (): string | null => {
        if (!form.cargo.trim()) return 'El cargo es obligatorio'
        if (!form.fecha_solicitud) return 'La fecha de solicitud es obligatoria'
        if (form.estado !== 'ACTIVA' && !form.fecha_real_ingreso) return 'La fecha real de ingreso es obligatoria cuando la vacante no está activa'
        return null
    }

    const buildPayload = () => ({
        estado: form.estado,
        fecha_solicitud: form.fecha_solicitud,
        fecha_real_ingreso: form.estado === 'ACTIVA' ? null : (form.fecha_real_ingreso || null),
        ans: form.ans.trim() ? parseInt(form.ans, 10) : null,
        cargo: form.cargo.trim(),
        planta: form.planta.trim() || null,
        area: form.area.trim() || null,
        nivel_cargo: form.nivel_cargo.trim() || null,
        origen_solicitud: form.origen_solicitud.trim() || null,
        numero_personas_solicitada: form.numero_personas_solicitada.trim() ? parseInt(form.numero_personas_solicitada, 10) : 1,
        solicita: form.solicita.trim() || null,
    })

    const handleGuardarClick = () => {
        const err = validar()
        if (err) { toast.error(err); return }
        setConfirmAction(esNueva ? 'crear' : 'guardar')
    }

    const confirmarGuardar = async () => {
        setSaving(true)
        try {
            const payload = buildPayload()
            if (esNueva) {
                const { error } = await (supabase.from('seleccion_vacantes' as any) as any).insert(payload)
                if (error) throw error
                toast.success('Vacante creada correctamente')
            } else {
                const { error } = await (supabase.from('seleccion_vacantes' as any) as any)
                    .update(payload)
                    .eq('id', vacante!.id)
                if (error) throw error
                toast.success('Vacante actualizada correctamente')
            }
            onSaved()
        } catch (err) {
            console.error('Error guardando vacante de selección:', err)
            toast.error('No se pudo guardar la vacante')
        } finally {
            setSaving(false)
            setConfirmAction(null)
        }
    }

    const confirmarEliminar = async () => {
        if (!vacante) return
        setDeleting(true)
        try {
            const { error } = await (supabase.from('seleccion_vacantes' as any) as any)
                .delete()
                .eq('id', vacante.id)
            if (error) throw error
            toast.success('Vacante eliminada correctamente')
            onDeleted()
        } catch (err) {
            console.error('Error eliminando vacante de selección:', err)
            toast.error('No se pudo eliminar la vacante')
        } finally {
            setDeleting(false)
            setConfirmAction(null)
        }
    }

    const fieldClass = "w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all text-sm font-medium disabled:opacity-70 disabled:cursor-default"
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
                            {esNueva ? 'Nueva vacante' : editando ? 'Editar vacante' : 'Detalle de la vacante'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {vacante?.solicitud_personal_id != null && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 font-medium">
                                Esta vacante se sincroniza automáticamente desde una solicitud de personal creada en Contratación. Los cambios de estado y datos básicos se actualizan solos cuando cambie la solicitud original.
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelClass}>Estado</label>
                                <select
                                    value={form.estado}
                                    disabled={!editando}
                                    onChange={(e) => set('estado', e.target.value as Vacante['estado'])}
                                    className={fieldClass}
                                >
                                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Cargo</label>
                                <input
                                    type="text"
                                    value={form.cargo}
                                    disabled={!editando}
                                    onChange={(e) => set('cargo', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Ej: Op mármol"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Fecha de solicitud</label>
                                <input
                                    type="date"
                                    value={form.fecha_solicitud}
                                    disabled={!editando}
                                    onChange={(e) => set('fecha_solicitud', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Fecha real de ingreso {form.estado === 'ACTIVA' && '(N/A, sigue activa)'}</label>
                                <input
                                    type="date"
                                    value={form.fecha_real_ingreso}
                                    disabled={!editando || form.estado === 'ACTIVA'}
                                    onChange={(e) => set('fecha_real_ingreso', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>ANS (días SLA)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.ans}
                                    disabled={!editando}
                                    onChange={(e) => set('ans', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Número de personas solicitadas</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.numero_personas_solicitada}
                                    disabled={!editando}
                                    onChange={(e) => set('numero_personas_solicitada', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Planta</label>
                                <input
                                    type="text"
                                    value={form.planta}
                                    disabled={!editando}
                                    onChange={(e) => set('planta', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Área</label>
                                <input
                                    type="text"
                                    value={form.area}
                                    disabled={!editando}
                                    onChange={(e) => set('area', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Nivel del cargo</label>
                                <input
                                    type="text"
                                    value={form.nivel_cargo}
                                    disabled={!editando}
                                    onChange={(e) => set('nivel_cargo', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Operativo, Administrativo, Promotor..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelClass}>Solicita</label>
                                <input
                                    type="text"
                                    value={form.solicita}
                                    disabled={!editando}
                                    onChange={(e) => set('solicita', e.target.value)}
                                    className={fieldClass}
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Origen de la solicitud</label>
                                <input
                                    type="text"
                                    value={form.origen_solicitud}
                                    disabled={!editando}
                                    onChange={(e) => set('origen_solicitud', e.target.value)}
                                    className={fieldClass}
                                    placeholder="Ej: Reemplazo renuncia, Incremento de la productividad..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 rounded-b-3xl">
                        {!esNueva && !editando && (
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
                                {!esNueva && (
                                    <button
                                        onClick={() => { setForm(toForm(vacante)); setEditando(false) }}
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
                                    {esNueva ? 'Crear vacante' : 'Guardar cambios'}
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
                description={`Se actualizará la vacante "${form.cargo}" con la información editada.`}
                confirmLabel="Guardar"
                onConfirm={confirmarGuardar}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                isOpen={confirmAction === 'crear'}
                variant="info"
                title="¿Crear esta vacante?"
                description={`Se añadirá "${form.cargo || 'esta vacante'}" a la base de datos general de Selección.`}
                confirmLabel="Crear"
                onConfirm={confirmarGuardar}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                isOpen={confirmAction === 'eliminar'}
                variant="danger"
                title="¿Eliminar esta vacante?"
                description={`Se eliminará "${vacante?.cargo}" de forma permanente. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                onConfirm={confirmarEliminar}
                onCancel={() => setConfirmAction(null)}
            />
        </>
    )
}
