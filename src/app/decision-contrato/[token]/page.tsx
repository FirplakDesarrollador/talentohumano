'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Loader2, CheckCircle2, AlertCircle, Building2, User } from 'lucide-react'

interface AlertaInfo {
    id: number
    tipo_contrato_en_momento: 'TEMPORAL' | 'TERMINO_FIJO'
    fecha_inicio_contrato_snapshot: string
    jefe_nombre: string | null
    decision: string | null
    decidido_at: string | null
    empleado_nombre: string
    empleado_cargo: string | null
    empleado_planta: string | null
}

const OPCIONES_TEMPORAL = [
    { value: 'PROLONGAR_TEMPORAL', label: 'Prolongar con la temporal', color: 'bg-blue-600 hover:bg-blue-700' },
    { value: 'CONTRATAR_TERMINO_FIJO', label: 'Contratar directo a término fijo', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { value: 'CONTRATAR_INDEFINIDO', label: 'Contratar a término indefinido', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { value: 'NO_PROLONGAR', label: 'No prolongar el contrato', color: 'bg-rose-600 hover:bg-rose-700' },
]

const OPCIONES_TERMINO_FIJO = [
    { value: 'PROLONGAR_TEMPORAL', label: 'Prolongar el contrato a término fijo', color: 'bg-blue-600 hover:bg-blue-700' },
    { value: 'CONTRATAR_INDEFINIDO', label: 'Contratar a término indefinido', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { value: 'NO_PROLONGAR', label: 'No prolongar el contrato', color: 'bg-rose-600 hover:bg-rose-700' },
]

const DECISION_LABELS: Record<string, string> = {
    PROLONGAR_TEMPORAL: 'Prolongar el contrato',
    CONTRATAR_TERMINO_FIJO: 'Contratar directo a término fijo',
    CONTRATAR_INDEFINIDO: 'Contratar a término indefinido',
    NO_PROLONGAR: 'No prolongar el contrato',
}

export default function DecisionContratoPage() {
    const params = useParams()
    const token = params.token as string
    const supabase = createClient()

    const [alerta, setAlerta] = useState<AlertaInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [decisionEnviada, setDecisionEnviada] = useState<string | null>(null)

    useEffect(() => {
        const fetchAlerta = async () => {
            try {
                const { data, error: rpcError } = await (supabase.rpc as any)('get_alerta_contrato_by_token', { p_token: token })
                if (rpcError) throw rpcError
                if (!data) {
                    setError('No se encontró esta solicitud de decisión.')
                    return
                }
                setAlerta(data)
                if (data.decision) setDecisionEnviada(data.decision)
            } catch (err) {
                console.error(err)
                setError('No se pudo cargar la información.')
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchAlerta()
    }, [token, supabase])

    const handleDecidir = async (decision: string) => {
        setSubmitting(decision)
        setError(null)
        try {
            const res = await fetch('/api/decision-contrato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, decision }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo registrar la decisión')
            setDecisionEnviada(decision)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'No se pudo registrar tu decisión. Intenta nuevamente.')
        } finally {
            setSubmitting(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
        )
    }

    if (error && !alerta) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-slate-100 p-10 text-center">
                    <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">{error}</p>
                </div>
            </div>
        )
    }

    if (!alerta) return null

    if (decisionEnviada) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl shadow-blue-100 border border-blue-50 p-12 text-center">
                    <div className="flex justify-center mb-8">
                        <div className="p-6 bg-green-100 rounded-full text-green-600">
                            <CheckCircle2 size={48} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">¡Decisión Registrada!</h2>
                    <p className="text-slate-500 leading-relaxed font-medium mb-4">
                        Se registró: <strong>{DECISION_LABELS[decisionEnviada] || decisionEnviada}</strong>
                    </p>
                    <p className="text-slate-400 text-sm">Talento Humano fue notificado y continuará el proceso.</p>
                </div>
            </div>
        )
    }

    const opciones = alerta.tipo_contrato_en_momento === 'TEMPORAL' ? OPCIONES_TEMPORAL : OPCIONES_TERMINO_FIJO

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans">
            <div className="max-w-xl mx-auto">
                <div className="text-center mb-8 mt-4">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 border-2 border-white">
                            <Briefcase size={26} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Decisión de Contrato</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Hola {alerta.jefe_nombre || ''}, tu decisión es requerida</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-6">
                    <div className="p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <User size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</p>
                                <p className="font-bold text-slate-800">{alerta.empleado_nombre}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo / Planta</p>
                                <p className="font-bold text-slate-800">{alerta.empleado_cargo || 'N/A'} · {alerta.empleado_planta || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                Cumplió {alerta.tipo_contrato_en_momento === 'TEMPORAL' ? '3 meses en contrato Temporal' : '2 meses en contrato a Término Fijo'}. ¿Qué se hará con su contrato?
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {opciones.map(op => (
                        <button
                            key={op.value}
                            onClick={() => handleDecidir(op.value)}
                            disabled={!!submitting}
                            className={`w-full h-14 ${op.color} disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3`}
                        >
                            {submitting === op.value ? <Loader2 size={20} className="animate-spin" /> : op.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="mt-8 text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} Firplak — Talento Humano
                </div>
            </div>
        </div>
    )
}
