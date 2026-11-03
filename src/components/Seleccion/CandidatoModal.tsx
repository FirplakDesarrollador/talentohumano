'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { X, Loader2, Trash2, Mail, FileText, ExternalLink, CheckCircle2 } from 'lucide-react'

export interface Candidato {
    id: number
    vacante_id: number | null
    nombre_completo: string
    cedula: string | null
    telefono: string | null
    email: string
    hoja_vida_url: string | null
    hoja_vida_nombre: string | null
    mensaje: string | null
    carta_agradecimiento_enviada_at: string | null
    carta_bienvenida_enviada_at: string | null
    carta_archivos_enviada_at: string | null
    created_at: string
    vacante_cargo?: string | null
}

const CARTAS: { tipo: 'agradecimiento' | 'bienvenida' | 'archivos'; label: string; campo: keyof Candidato }[] = [
    { tipo: 'agradecimiento', label: 'Carta de agradecimiento', campo: 'carta_agradecimiento_enviada_at' },
    { tipo: 'bienvenida', label: 'Carta de bienvenida', campo: 'carta_bienvenida_enviada_at' },
    { tipo: 'archivos', label: 'Confirmación de archivos recibidos', campo: 'carta_archivos_enviada_at' },
]

export function CandidatoModal({
    candidato,
    onClose,
    onChanged,
}: {
    candidato: Candidato
    onClose: () => void
    onChanged: () => void
}) {
    const supabase = createClient()
    const [enviando, setEnviando] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [pendingCarta, setPendingCarta] = useState<typeof CARTAS[number] | null>(null)
    const [pendingDelete, setPendingDelete] = useState(false)

    const confirmarEnviarCarta = async () => {
        if (!pendingCarta) return
        setEnviando(pendingCarta.tipo)
        try {
            const res = await fetch('/api/seleccion/enviar-carta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidatoId: candidato.id, tipo: pendingCarta.tipo }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Error al enviar la carta')
            }
            toast.success(`${pendingCarta.label} enviada correctamente`)
            onChanged()
        } catch (err: any) {
            console.error('Error enviando carta:', err)
            toast.error(err.message || 'No se pudo enviar la carta')
        } finally {
            setEnviando(null)
            setPendingCarta(null)
        }
    }

    const confirmarEliminar = async () => {
        setDeleting(true)
        try {
            const { error } = await (supabase.from('seleccion_candidatos' as any) as any)
                .delete()
                .eq('id', candidato.id)
            if (error) throw error
            toast.success('Candidato eliminado correctamente')
            onChanged()
            onClose()
        } catch (err) {
            console.error('Error eliminando candidato:', err)
            toast.error('No se pudo eliminar el candidato')
        } finally {
            setDeleting(false)
            setPendingDelete(false)
        }
    }

    const infoRow = (label: string, value: string | null | undefined) => (
        <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-medium text-slate-700">{value || '—'}</p>
        </div>
    )

    return (
        <>
            <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" onClick={onClose}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div
                    className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
                        <h2 className="font-black text-lg text-slate-800">{candidato.nombre_completo}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {infoRow('Vacante', candidato.vacante_cargo)}
                            {infoRow('Cédula', candidato.cedula)}
                            {infoRow('Teléfono', candidato.telefono)}
                            {infoRow('Email', candidato.email)}
                            {infoRow('Fecha de inscripción', new Date(candidato.created_at).toLocaleDateString('es-CO'))}
                        </div>

                        {candidato.mensaje && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mensaje</p>
                                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{candidato.mensaje}</p>
                            </div>
                        )}

                        {candidato.hoja_vida_url && (
                            <a
                                href={candidato.hoja_vida_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800"
                            >
                                <FileText size={16} />
                                {candidato.hoja_vida_nombre || 'Ver hoja de vida'}
                                <ExternalLink size={13} />
                            </a>
                        )}

                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Enviar carta</p>
                            {CARTAS.map(c => {
                                const enviadaEn = candidato[c.campo] as string | null
                                return (
                                    <div key={c.tipo} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{c.label}</p>
                                            {enviadaEn ? (
                                                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                                    <CheckCircle2 size={12} />
                                                    Enviada el {new Date(enviadaEn).toLocaleDateString('es-CO')}
                                                </p>
                                            ) : (
                                                <p className="text-[11px] text-slate-400">No se ha enviado</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setPendingCarta(c)}
                                            disabled={enviando === c.tipo}
                                            className="h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                                        >
                                            {enviando === c.tipo ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                                            {enviadaEn ? 'Reenviar' : 'Enviar'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between rounded-b-3xl">
                        <button
                            onClick={() => setPendingDelete(true)}
                            disabled={deleting}
                            className="h-11 px-4 flex items-center gap-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all text-sm font-bold disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!pendingCarta}
                variant="info"
                title={`¿Enviar "${pendingCarta?.label}"?`}
                description={`Se enviará un correo a ${candidato.email} (${candidato.nombre_completo}).`}
                confirmLabel="Enviar"
                onConfirm={confirmarEnviarCarta}
                onCancel={() => setPendingCarta(null)}
            />
            <ConfirmDialog
                isOpen={pendingDelete}
                variant="danger"
                title="¿Eliminar este candidato?"
                description={`Se eliminará la inscripción de "${candidato.nombre_completo}" de forma permanente. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                onConfirm={confirmarEliminar}
                onCancel={() => setPendingDelete(false)}
            />
        </>
    )
}
