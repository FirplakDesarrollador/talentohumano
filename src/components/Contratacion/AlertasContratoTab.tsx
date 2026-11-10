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
    Pencil,
    X,
    ClipboardList,
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

const UMBRAL_MESES: Record<string, number> = {
    TEMPORAL: 3,
    TERMINO_FIJO: 2,
}

interface Candidato {
    id: number
    nombreCompleto: string | null
    cargo: string | null
    planta: string | null
    jefe: string | null
    tipo_contrato: 'TEMPORAL' | 'TERMINO_FIJO'
    fecha_inicio_contrato_actual: string
}

function mesesTranscurridos(fechaInicio: string): number {
    const inicio = new Date(`${fechaInicio}T00:00:00`)
    const ahora = new Date()
    let meses = (ahora.getFullYear() - inicio.getFullYear()) * 12 + (ahora.getMonth() - inicio.getMonth())
    if (ahora.getDate() < inicio.getDate()) meses--
    return Math.max(meses, 0)
}

export function AlertasContratoTab() {
    const supabase = createClient()
    const [alertas, setAlertas] = useState<Alerta[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState<'pendientes' | 'todas' | 'revision'>('pendientes')
    const [copiedId, setCopiedId] = useState<number | null>(null)

    const [candidatos, setCandidatos] = useState<Candidato[]>([])
    const [loadingCandidatos, setLoadingCandidatos] = useState(true)
    const [editandoId, setEditandoId] = useState<number | null>(null)
    const [fechaEditada, setFechaEditada] = useState('')
    const [guardando, setGuardando] = useState(false)

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

    const fetchCandidatos = async () => {
        setLoadingCandidatos(true)
        try {
            const { data, error } = await (supabase as any)
                .from('empleados')
                .select('id, nombreCompleto, cargo, planta, jefe, tipo_contrato, fecha_inicio_contrato_actual')
                .eq('activo', true)
                .in('tipo_contrato', ['TEMPORAL', 'TERMINO_FIJO'])
                .not('fecha_inicio_contrato_actual', 'is', null)

            if (error) throw error
            const vencidos = ((data || []) as Candidato[]).filter(
                c => mesesTranscurridos(c.fecha_inicio_contrato_actual) >= UMBRAL_MESES[c.tipo_contrato]
            )
            vencidos.sort((a, b) => mesesTranscurridos(b.fecha_inicio_contrato_actual) - mesesTranscurridos(a.fecha_inicio_contrato_actual))
            setCandidatos(vencidos)
        } catch (error) {
            console.error('Error fetching candidatos a revision:', error)
        } finally {
            setLoadingCandidatos(false)
        }
    }

    useEffect(() => {
        fetchAlertas()
        fetchCandidatos()
    }, [])

    const handleEmpezarEdicion = (c: Candidato) => {
        setEditandoId(c.id)
        setFechaEditada(c.fecha_inicio_contrato_actual)
    }

    const handleCancelarEdicion = () => {
        setEditandoId(null)
        setFechaEditada('')
    }

    const handleGuardarFecha = async (c: Candidato) => {
        if (!fechaEditada) {
            toast.error('Selecciona una fecha')
            return
        }
        setGuardando(true)
        try {
            const res = await fetch('/api/alertas-contrato/actualizar-fecha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empleadoId: c.id, fechaInicioContratoActual: fechaEditada }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'No se pudo actualizar la fecha')

            toast.success(`Fecha actualizada para ${c.nombreCompleto}`)
            setEditandoId(null)
            setFechaEditada('')
            fetchCandidatos()
        } catch (error: any) {
            toast.error(error.message || 'Error al actualizar la fecha')
        } finally {
            setGuardando(false)
        }
    }

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

    if (loading || loadingCandidatos) {
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
                    <div className={`text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 w-fit ${filtro === 'revision' ? 'bg-amber-500 shadow-amber-100' : 'bg-blue-600 shadow-blue-100'}`}>
                        {filtro === 'revision' ? <ClipboardList size={18} /> : <BellRing size={18} />}
                        {filtro === 'revision' ? candidatos.length : alertasFiltradas.length} {filtro === 'revision' ? 'Por revisar' : 'Alertas'}
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
                        <button
                            onClick={() => setFiltro('revision')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${filtro === 'revision' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Por revisar
                            {candidatos.length > 0 && (
                                <span className={`px-1.5 rounded-full text-[10px] ${filtro === 'revision' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {candidatos.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => { fetchAlertas(); fetchCandidatos(); }}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                    title="Refrescar"
                >
                    <RefreshCcw size={18} className={loading || loadingCandidatos ? 'animate-spin' : ''} />
                </button>
            </div>

            {filtro === 'revision' && (
                <p className="text-sm text-slate-500 -mt-2">
                    Contratos Temporales o a Término Fijo que ya cumplieron su umbral (3 y 2 meses respectivamente) y cuya fecha de inicio puede necesitar corrección antes de avisarle al jefe. Edita la fecha si estaba mal cargada; si es correcta, déjala así para que el jefe reciba la alerta normalmente.
                </p>
            )}

            {filtro === 'revision' ? (
                candidatos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                        <ClipboardList size={48} className="text-slate-300" />
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Nada por revisar</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {candidatos.map(c => {
                            const meses = mesesTranscurridos(c.fecha_inicio_contrato_actual)
                            const editando = editandoId === c.id
                            return (
                                <div key={c.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-black text-slate-800 text-lg">{c.nombreCompleto || 'Empleado'}</h3>
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                                    {TIPO_LABELS[c.tipo_contrato] || c.tipo_contrato}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-amber-100 text-amber-700 border-amber-200">
                                                    {meses} meses sin decisión
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Building2 size={14} className="text-blue-500 shrink-0" />
                                                    {c.cargo || 'N/A'} · {c.planta || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <User size={14} className="text-blue-500 shrink-0" />
                                                    Jefe: {c.jefe || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar size={14} className="text-blue-500 shrink-0" />
                                                    {editando ? (
                                                        <input
                                                            type="date"
                                                            value={fechaEditada}
                                                            onChange={(e) => setFechaEditada(e.target.value)}
                                                            disabled={guardando}
                                                            className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-blue-400"
                                                        />
                                                    ) : (
                                                        <>Inicio: {new Date(`${c.fecha_inicio_contrato_actual}T00:00:00`).toLocaleDateString()}</>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-2">
                                            {editando ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGuardarFecha(c)}
                                                        disabled={guardando}
                                                        className="h-11 px-4 flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all text-xs font-bold"
                                                    >
                                                        {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                        Guardar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelarEdicion}
                                                        disabled={guardando}
                                                        className="h-11 px-3 flex items-center gap-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all text-xs font-bold"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEmpezarEdicion(c)}
                                                    className="h-11 px-4 flex items-center gap-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold"
                                                    title="Editar fecha de inicio de contrato"
                                                >
                                                    <Pencil size={16} />
                                                    Editar fecha
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            ) : alertasFiltradas.length === 0 ? (
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
