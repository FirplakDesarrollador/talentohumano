'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
    Loader2,
    Briefcase,
    Building2,
    Users,
    Calendar,
    Mail,
    RefreshCcw,
    ClipboardList,
    ExternalLink,
    Trash2,
} from 'lucide-react'

interface Solicitud {
    id: number
    created_at: string
    solicitante_nombre: string
    solicitante_correo: string
    cargo_solicitado: string
    area_planta: string | null
    motivo: string
    reemplazo_de: string | null
    cantidad_personas: number
    fecha_requerida: string | null
    perfil: string | null
    perfil_archivo_url: string | null
    perfil_archivo_nombre: string | null
    salario: string | null
    horario: string | null
    estado: string
    planner_task_url: string | null
}

const ESTADOS = [
    { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'CUBIERTA', label: 'Cubierta', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'CANCELADA', label: 'Cancelada', color: 'bg-rose-100 text-rose-700 border-rose-200' },
]

export function SolicitudesPersonalTab() {
    const supabase = createClient()
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [pendingDelete, setPendingDelete] = useState<Solicitud | null>(null)

    const fetchSolicitudes = async () => {
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from('solicitudes_personal')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setSolicitudes(data || [])
        } catch (error) {
            console.error('Error fetching solicitudes de personal:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSolicitudes()
    }, [])

    const handleEstadoChange = async (id: number, estado: string) => {
        setUpdatingId(id)
        try {
            const { error } = await (supabase.from('solicitudes_personal') as any)
                .update({ estado })
                .eq('id', id)

            if (error) throw error
            setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado } : s))
        } catch (error) {
            console.error('Error updating estado:', error)
            alert('No se pudo actualizar el estado')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleDelete = async (solicitud: Solicitud) => {
        setDeletingId(solicitud.id)
        try {
            const { error } = await (supabase.from('solicitudes_personal') as any)
                .delete()
                .eq('id', solicitud.id)

            if (error) throw error
            setSolicitudes(prev => prev.filter(s => s.id !== solicitud.id))
            toast.success('Solicitud eliminada correctamente')
        } catch (error) {
            console.error('Error deleting solicitud de personal:', error)
            toast.error('No se pudo eliminar la solicitud')
        } finally {
            setDeletingId(null)
            setPendingDelete(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2 w-fit">
                    <ClipboardList size={18} />
                    {solicitudes.length} Solicitudes
                </div>
                <button
                    onClick={fetchSolicitudes}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                    title="Refrescar"
                >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {solicitudes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                    <ClipboardList size={48} className="text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sin solicitudes de personal</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {solicitudes.map(s => {
                        const estadoInfo = ESTADOS.find(e => e.value === s.estado) || ESTADOS[0]
                        return (
                            <div key={s.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-black text-slate-800 text-lg">{s.cargo_solicitado}</h3>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${estadoInfo.color}`}>
                                                {estadoInfo.label}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                                {s.motivo}{s.reemplazo_de ? ` (de ${s.reemplazo_de})` : ''}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Building2 size={14} className="text-blue-500 shrink-0" />
                                                {s.area_planta || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Users size={14} className="text-blue-500 shrink-0" />
                                                {s.cantidad_personas} persona{s.cantidad_personas !== 1 ? 's' : ''}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={14} className="text-blue-500 shrink-0" />
                                                {s.fecha_requerida ? new Date(s.fecha_requerida).toLocaleDateString() : 'Sin fecha'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Mail size={14} className="text-blue-500 shrink-0" />
                                                <span className="truncate">{s.solicitante_correo}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="text-xs text-slate-400">
                                                Solicitado por <span className="font-bold text-slate-600">{s.solicitante_nombre}</span> · {new Date(s.created_at).toLocaleDateString()}
                                            </p>
                                            {s.planner_task_url && (
                                                <a
                                                    href={s.planner_task_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800"
                                                >
                                                    Ver tarea en Planner <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>

                                        {(s.perfil || s.perfil_archivo_url || s.salario || s.horario) && (
                                            <div className="pt-3 border-t border-slate-50 space-y-1.5 text-xs">
                                                {s.perfil && <p><span className="font-bold text-slate-600">Perfil:</span> <span className="text-slate-500">{s.perfil}</span></p>}
                                                {s.perfil_archivo_url && (
                                                    <p>
                                                        <span className="font-bold text-slate-600">Perfil:</span>{' '}
                                                        <a
                                                            href={s.perfil_archivo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 underline underline-offset-2 inline-flex items-center gap-1"
                                                        >
                                                            {s.perfil_archivo_nombre || 'Ver archivo adjunto'} <ExternalLink size={11} />
                                                        </a>
                                                    </p>
                                                )}
                                                {s.salario && <p><span className="font-bold text-slate-600">Salario:</span> <span className="text-slate-500">{s.salario}</span></p>}
                                                {s.horario && <p><span className="font-bold text-slate-600">Horario:</span> <span className="text-slate-500">{s.horario}</span></p>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        <select
                                            value={s.estado}
                                            disabled={updatingId === s.id}
                                            onChange={(e) => handleEstadoChange(s.id, e.target.value)}
                                            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            {ESTADOS.map(e => (
                                                <option key={e.value} value={e.value}>{e.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setPendingDelete(s)}
                                            disabled={deletingId === s.id}
                                            title="Eliminar solicitud"
                                            className="h-11 w-11 flex items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                                        >
                                            {deletingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!pendingDelete}
                variant="danger"
                title="¿Eliminar esta solicitud?"
                description={`Se eliminará la solicitud de personal para "${pendingDelete?.cargo_solicitado}" de forma permanente. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    )
}
