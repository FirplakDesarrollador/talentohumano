'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Loader2,
    BellRing,
    Building2,
    Calendar,
    Mail,
    RefreshCcw,
    Link2,
    Check,
    User,
} from 'lucide-react'

interface Alerta {
    id: number
    empleado_id: number
    tipo_contrato_en_momento: 'TEMPORAL' | 'TERMINO_FIJO'
    fecha_inicio_contrato_snapshot: string
    fecha_alerta: string
    jefe_nombre: string | null
    jefe_correo: string | null
    token: string
    decision: string | null
    decidido_at: string | null
    notificacion_enviada: boolean
    empleados: {
        nombreCompleto: string | null
        cargo: string | null
        planta: string | null
    } | null
}

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
    PROLONGAR_TEMPORAL: { label: 'Prolongó contrato', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    CONTRATAR_TERMINO_FIJO: { label: 'Contratado a término fijo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    CONTRATAR_INDEFINIDO: { label: 'Contratado a indefinido', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    NO_PROLONGAR: { label: 'No se prolongó', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

const TIPO_LABELS: Record<string, string> = {
    TEMPORAL: 'Temporal (3 meses)',
    TERMINO_FIJO: 'Término Fijo (2 meses)',
}

export function AlertasContratoTab() {
    const supabase = createClient()
    const [alertas, setAlertas] = useState<Alerta[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState<'pendientes' | 'todas'>('pendientes')
    const [copiedId, setCopiedId] = useState<number | null>(null)

    const fetchAlertas = async () => {
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from('alertas_contrato')
                .select('*, empleados:empleado_id(nombreCompleto, cargo, planta)')
                .order('fecha_alerta', { ascending: false })

            if (error) throw error
            setAlertas(data || [])
        } catch (error) {
            console.error('Error fetching alertas de contrato:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAlertas()
    }, [])

    const handleCopyLink = async (alerta: Alerta) => {
        const link = `${window.location.origin}/decision-contrato/${alerta.token}`
        try {
            await navigator.clipboard.writeText(link)
            setCopiedId(alerta.id)
            toast.success('Link copiado al portapapeles')
            setTimeout(() => setCopiedId(null), 2000)
        } catch (error) {
            toast.error('No se pudo copiar el link')
        }
    }

    const alertasFiltradas = filtro === 'pendientes' ? alertas.filter(a => !a.decision) : alertas

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2 w-fit">
                        <BellRing size={18} />
                        {alertasFiltradas.length} Alertas
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setFiltro('pendientes')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtro === 'pendientes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFiltro('todas')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filtro === 'todas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Todas
                        </button>
                    </div>
                </div>
                <button
                    onClick={fetchAlertas}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                    title="Refrescar"
                >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {alertasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                    <BellRing size={48} className="text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        {filtro === 'pendientes' ? 'Sin alertas pendientes' : 'Sin alertas de contrato'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {alertasFiltradas.map(a => {
                        const decisionInfo = a.decision ? DECISION_LABELS[a.decision] : null
                        return (
                            <div key={a.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-black text-slate-800 text-lg">{a.empleados?.nombreCompleto || 'Empleado'}</h3>
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                                {TIPO_LABELS[a.tipo_contrato_en_momento] || a.tipo_contrato_en_momento}
                                            </span>
                                            {decisionInfo ? (
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${decisionInfo.color}`}>
                                                    {decisionInfo.label}
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-amber-100 text-amber-700 border-amber-200">
                                                    Pendiente respuesta del jefe
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Building2 size={14} className="text-blue-500 shrink-0" />
                                                {a.empleados?.cargo || 'N/A'} · {a.empleados?.planta || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <User size={14} className="text-blue-500 shrink-0" />
                                                Jefe: {a.jefe_nombre || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={14} className="text-blue-500 shrink-0" />
                                                Alertado el {new Date(a.fecha_alerta).toLocaleDateString()}
                                            </div>
                                            {a.jefe_correo && (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Mail size={14} className="text-blue-500 shrink-0" />
                                                    <span className="truncate">{a.jefe_correo}</span>
                                                </div>
                                            )}
                                            {a.decidido_at && (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Check size={14} className="text-emerald-500 shrink-0" />
                                                    Respondido el {new Date(a.decidido_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!a.decision && (
                                        <div className="shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyLink(a)}
                                                className="h-11 px-4 flex items-center gap-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold"
                                                title="Copiar link de decisión para reenviar al jefe"
                                            >
                                                {copiedId === a.id ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />}
                                                {copiedId === a.id ? 'Copiado' : 'Copiar link'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
