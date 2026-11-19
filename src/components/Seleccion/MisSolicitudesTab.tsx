'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Loader2,
    ClipboardList,
    Building2,
    MapPin,
    Calendar,
    Users,
    ExternalLink,
} from 'lucide-react'

interface SolicitudVinculada {
    descripcion_cargo: string | null
    descripcion_cargo_archivo_url: string | null
    descripcion_cargo_archivo_nombre: string | null
    perfil: string | null
    salario: string | null
    horario: string | null
    motivo: string | null
    reemplazo_de: string | null
    planner_task_url: string | null
}

interface VacanteMia {
    id: number
    estado: 'ACTIVA' | 'CERRADA' | 'CANCELADA'
    fecha_solicitud: string
    cargo: string
    area: string | null
    planta: string | null
    numero_personas_solicitada: number
    activo: boolean
    solicitudes_personal: SolicitudVinculada | null
}

const ESTADO_BADGE: Record<string, string> = {
    ACTIVA: 'bg-blue-100 text-blue-700 border-blue-200',
    CERRADA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CANCELADA: 'bg-slate-200 text-slate-600 border-slate-300',
}

export function MisSolicitudesTab({ empleadoId }: { empleadoId: number }) {
    const supabase = createClient()
    const [vacantes, setVacantes] = useState<VacanteMia[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<number | null>(null)

    const fetchMisVacantes = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await (supabase.from('seleccion_vacantes' as any) as any)
                .select('id, estado, fecha_solicitud, cargo, area, planta, numero_personas_solicitada, activo, solicitudes_personal!inner(descripcion_cargo, descripcion_cargo_archivo_url, descripcion_cargo_archivo_nombre, perfil, salario, horario, motivo, reemplazo_de, planner_task_url, solicitante_empleado_id)')
                .eq('solicitudes_personal.solicitante_empleado_id', empleadoId)
                .order('fecha_solicitud', { ascending: false })

            if (error) throw error
            setVacantes(data || [])
        } catch (err) {
            console.error('Error cargando mis solicitudes:', err)
        } finally {
            setLoading(false)
        }
    }, [empleadoId])

    useEffect(() => {
        fetchMisVacantes()
    }, [fetchMisVacantes])

    const handleToggleActivo = async (vacanteId: number, nuevoValor: boolean) => {
        setUpdatingId(vacanteId)
        try {
            const { error } = await (supabase.from('seleccion_vacantes' as any) as any)
                .update({ activo: nuevoValor })
                .eq('id', vacanteId)
            if (error) throw error
            setVacantes(prev => prev.map(v => v.id === vacanteId ? { ...v, activo: nuevoValor } : v))
            toast.success(nuevoValor ? 'Cargo marcado como activo' : 'Cargo marcado como inactivo')
        } catch (err) {
            console.error('Error actualizando activo/inactivo:', err)
            toast.error('No se pudo actualizar el estado')
        } finally {
            setUpdatingId(null)
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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-[#1D3557] tracking-tight">Mis Solicitudes de Personal</h2>
                <p className="text-sm text-slate-500 mt-0.5">Cargos que has solicitado. Puedes marcar un cargo como inactivo si ya no necesitas seguir recibiendo candidatos para él.</p>
            </div>

            {vacantes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50 bg-white rounded-2xl border border-slate-100">
                    <ClipboardList size={48} className="text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Aún no has solicitado personal</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {vacantes.map(v => {
                        const sp = v.solicitudes_personal
                        return (
                            <div key={v.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-black text-slate-800 text-lg">{v.cargo}</h3>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ESTADO_BADGE[v.estado]}`}>
                                                {v.estado}
                                            </span>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${v.activo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {v.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Building2 size={14} className="text-blue-500 shrink-0" />
                                                {v.area || '—'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <MapPin size={14} className="text-blue-500 shrink-0" />
                                                {v.planta || '—'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={14} className="text-blue-500 shrink-0" />
                                                {new Date(`${v.fecha_solicitud}T00:00:00`).toLocaleDateString('es-CO')}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Users size={14} className="text-blue-500 shrink-0" />
                                                {v.numero_personas_solicitada} persona{v.numero_personas_solicitada !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        {sp && (
                                            <div className="pt-3 border-t border-slate-50 space-y-1.5 text-xs">
                                                {sp.descripcion_cargo && (
                                                    <p><span className="font-bold text-slate-600">Descripción del cargo:</span> <span className="text-slate-500">{sp.descripcion_cargo}</span></p>
                                                )}
                                                {sp.descripcion_cargo_archivo_url && (
                                                    <p>
                                                        <span className="font-bold text-slate-600">Descripción del cargo:</span>{' '}
                                                        <a
                                                            href={sp.descripcion_cargo_archivo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 underline underline-offset-2 inline-flex items-center gap-1"
                                                        >
                                                            {sp.descripcion_cargo_archivo_nombre || 'Ver archivo adjunto'} <ExternalLink size={11} />
                                                        </a>
                                                    </p>
                                                )}
                                                {sp.planner_task_url && (
                                                    <a
                                                        href={sp.planner_task_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800"
                                                    >
                                                        Ver tarea en Planner <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0">
                                        <select
                                            value={v.activo ? 'activo' : 'inactivo'}
                                            disabled={updatingId === v.id}
                                            onChange={(e) => handleToggleActivo(v.id, e.target.value === 'activo')}
                                            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
