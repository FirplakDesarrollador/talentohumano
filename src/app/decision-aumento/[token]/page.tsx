'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Loader2, CheckCircle2, XCircle, AlertCircle, User, Briefcase } from 'lucide-react'

interface AumentoInfo {
    id: number
    estado: string
    salarioActual: number
    salarioPropuesto: number
    cargoAnterior: string | null
    cargoPropuesto: string | null
    requiereAscenso: boolean
    comentariosSolicitante: string | null
    fechaAplicacion: string | null
    empleado_nombre: string
    empleado_cargo: string | null
    empleado_planta: string | null
    solicitante_nombre: string | null
}

function formatCurrency(amount: number) {
    if (!amount) return '$0'
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

export default function DecisionAumentoPage() {
    const params = useParams()
    const token = params.token as string
    const supabase = createClient()

    const [aumento, setAumento] = useState<AumentoInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [decisionEnviada, setDecisionEnviada] = useState<string | null>(null)

    useEffect(() => {
        const fetchAumento = async () => {
            try {
                const { data, error: rpcError } = await (supabase.rpc as any)('get_aumento_by_token', { p_token: token })
                if (rpcError) throw rpcError
                if (!data) {
                    setError('No se encontró esta solicitud.')
                    return
                }
                setAumento(data)
                if (data.estado !== 'Pendiente') setDecisionEnviada(data.estado)
            } catch (err) {
                console.error(err)
                setError('No se pudo cargar la información.')
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchAumento()
    }, [token, supabase])

    const handleDecidir = async (decision: 'Aprobada' | 'Rechazada') => {
        setSubmitting(decision)
        setError(null)
        try {
            const res = await fetch('/api/decision-aumento', {
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

    if (error && !aumento) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-slate-100 p-10 text-center">
                    <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">{error}</p>
                </div>
            </div>
        )
    }

    if (!aumento) return null

    if (decisionEnviada) {
        const aprobado = decisionEnviada === 'Aprobada'
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl shadow-blue-100 border border-blue-50 p-12 text-center">
                    <div className="flex justify-center mb-8">
                        <div className={`p-6 rounded-full ${aprobado ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                            {aprobado ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">
                        {aprobado ? '¡Solicitud Aprobada!' : 'Solicitud Rechazada'}
                    </h2>
                    <p className="text-slate-500 leading-relaxed font-medium mb-4">
                        Quedó registrada tu decisión para <strong>{aumento.empleado_nombre}</strong>.
                    </p>
                    <p className="text-slate-400 text-sm">Se le notificó al solicitante.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans">
            <div className="max-w-xl mx-auto">
                <div className="text-center mb-8 mt-4">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 border-2 border-white">
                            <TrendingUp size={26} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Solicitud de Aumento Salarial</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Tu decisión es requerida</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-6">
                    <div className="p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <User size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</p>
                                <p className="font-bold text-slate-800">{aumento.empleado_nombre}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <Briefcase size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</p>
                                <p className="font-bold text-slate-800">
                                    {aumento.requiereAscenso
                                        ? `${aumento.cargoAnterior} → ${aumento.cargoPropuesto} (ascenso)`
                                        : (aumento.empleado_cargo || aumento.cargoAnterior || 'N/A')}
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salario actual</p>
                                <p className="font-bold text-slate-500 line-through">{formatCurrency(aumento.salarioActual)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salario propuesto</p>
                                <p className="font-black text-emerald-600">{formatCurrency(aumento.salarioPropuesto)}</p>
                            </div>
                        </div>
                        {aumento.comentariosSolicitante && (
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Justificación</p>
                                <p className="text-sm text-slate-600 italic">&quot;{aumento.comentariosSolicitante}&quot;</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => handleDecidir('Aprobada')}
                        disabled={!!submitting}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
                    >
                        {submitting === 'Aprobada' ? <Loader2 size={20} className="animate-spin" /> : 'Aprobar'}
                    </button>
                    <button
                        onClick={() => handleDecidir('Rechazada')}
                        disabled={!!submitting}
                        className="w-full h-14 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
                    >
                        {submitting === 'Rechazada' ? <Loader2 size={20} className="animate-spin" /> : 'Rechazar'}
                    </button>
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
