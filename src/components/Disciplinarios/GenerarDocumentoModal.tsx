'use client'

import { useState } from 'react'
import { X, Loader2, FileDown } from 'lucide-react'
import { toast } from 'sonner'

interface GenerarDocumentoModalProps {
    proceso: { id: number | string; tipo: string }
    onClose: () => void
}

type TipoDocumento = 'llamado' | 'citacion' | 'respuesta'

const TIPOS_SANCION = ['Memorando', 'Llamado de atención', 'Suspensión']

export function GenerarDocumentoModal({ proceso, onClose }: GenerarDocumentoModalProps) {
    const esDescargo = proceso.tipo === 'Descargo'
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento | null>(esDescargo ? null : 'llamado')
    const [tipoSancion, setTipoSancion] = useState('')
    const [diasSuspension, setDiasSuspension] = useState('')
    const [generando, setGenerando] = useState(false)

    const necesitaDatosSancion = tipoDocumento === 'respuesta'
    const puedeGenerar = tipoDocumento && (!necesitaDatosSancion || (tipoSancion && (tipoSancion !== 'Suspensión' || diasSuspension)))

    const handleGenerar = async () => {
        if (!tipoDocumento) return
        setGenerando(true)
        try {
            const res = await fetch('/api/procesos-disciplinarios/generar-documento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    procesoId: proceso.id,
                    tipoDocumento,
                    tipo_sancion: necesitaDatosSancion ? tipoSancion : undefined,
                    dias_suspension: necesitaDatosSancion && tipoSancion === 'Suspensión' ? Number(diasSuspension) : undefined,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'No se pudo generar el documento')

            const byteChars = atob(json.archivoBase64)
            const byteNumbers = new Array(byteChars.length)
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: json.contentType })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = json.nombreArchivo
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)

            toast.success(json.fueConvertidoAPdf
                ? 'Documento generado y guardado en Archivo Digital'
                : 'Documento generado en Word (no se pudo convertir a PDF) y guardado en Archivo Digital')
            onClose()
        } catch (err: any) {
            console.error('Error generando documento:', err)
            toast.error(err.message || 'No se pudo generar el documento')
        } finally {
            setGenerando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300 border border-white">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-xl text-[#1D3557] tracking-tight">Generar documento</h3>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                {esDescargo ? (
                    <div className="mt-6 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">¿Qué carta quieres generar?</label>
                        <button
                            onClick={() => setTipoDocumento('citacion')}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${tipoDocumento === 'citacion' ? 'border-[#1D3557] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <p className="font-bold text-sm text-slate-800">Citación a descargos</p>
                            <p className="text-xs text-slate-500">Carta de inicio del proceso, antes de la audiencia</p>
                        </button>
                        <button
                            onClick={() => setTipoDocumento('respuesta')}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${tipoDocumento === 'respuesta' ? 'border-[#1D3557] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <p className="font-bold text-sm text-slate-800">Respuesta / Decisión final</p>
                            <p className="text-xs text-slate-500">Carta con la sanción o absolución, después de la audiencia</p>
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 font-medium mt-1 mb-2">Se generará la carta de Llamado de Atención con la información de este proceso.</p>
                )}

                {necesitaDatosSancion && (
                    <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de sanción <span className="text-rose-500">*</span></label>
                            <select
                                value={tipoSancion}
                                onChange={(e) => setTipoSancion(e.target.value)}
                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1D3557]"
                            >
                                <option value="">Seleccione el tipo de sanción</option>
                                {TIPOS_SANCION.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {tipoSancion === 'Suspensión' && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Días de suspensión <span className="text-rose-500">*</span></label>
                                <input
                                    type="number"
                                    min={1}
                                    value={diasSuspension}
                                    onChange={(e) => setDiasSuspension(e.target.value)}
                                    placeholder="Ej. 3"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1D3557]"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} disabled={generando} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-40 transition-all">
                        Cancelar
                    </button>
                    <button
                        disabled={!puedeGenerar || generando}
                        onClick={handleGenerar}
                        className="flex-1 h-11 rounded-xl bg-[#1D3557] text-white font-bold text-sm hover:bg-[#162943] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileDown className="h-4 w-4" /> Generar</>}
                    </button>
                </div>
            </div>
        </div>
    )
}
