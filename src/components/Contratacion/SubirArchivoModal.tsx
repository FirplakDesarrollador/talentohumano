'use client'

import { useState } from 'react'
import { X, UploadCloud, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const SUBCARPETAS = ['Contrato', 'Correspondencia', 'Documentos', 'Procesos disciplinarios'] as const

interface SubirArchivoModalProps {
    isOpen: boolean
    onClose: () => void
    categoria: string
    carpetaOrigen: string
    onUploaded: () => void
}

export function SubirArchivoModal({ isOpen, onClose, categoria, carpetaOrigen, onUploaded }: SubirArchivoModalProps) {
    const [subcarpeta, setSubcarpeta] = useState<(typeof SUBCARPETAS)[number]>('Documentos')
    const [file, setFile] = useState<File | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    if (!isOpen) return null

    const handleClose = () => {
        if (isSaving) return
        setFile(null)
        setSubcarpeta('Documentos')
        onClose()
    }

    const handleSave = async () => {
        if (!file) {
            toast.error('Selecciona un archivo primero')
            return
        }
        setIsSaving(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('categoria', categoria)
            formData.append('carpetaOrigen', carpetaOrigen)
            formData.append('subcarpeta', subcarpeta)

            const res = await fetch('/api/archivo-digital/subir', { method: 'POST', body: formData })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'No se pudo subir el archivo')

            toast.success('Archivo subido correctamente')
            onUploaded()
            handleClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al subir el archivo')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[28px] w-full max-w-[480px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="bg-[#1D3557] text-white p-6 relative">
                    <button
                        onClick={handleClose}
                        disabled={isSaving}
                        className="absolute right-5 top-5 text-white/50 hover:text-white transition-colors p-1 disabled:opacity-40"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                            <UploadCloud className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">Subir archivo</h3>
                            <p className="text-blue-200/70 text-xs font-bold uppercase tracking-widest mt-0.5 truncate max-w-[320px]">
                                {carpetaOrigen}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Carpeta destino
                        </label>
                        <select
                            value={subcarpeta}
                            onChange={(e) => setSubcarpeta(e.target.value as (typeof SUBCARPETAS)[number])}
                            disabled={isSaving}
                            className="w-full h-12 rounded-2xl border-2 border-gray-100 bg-white px-4 text-sm font-semibold focus:border-[#1D3557] focus:outline-none transition-all disabled:opacity-50"
                        >
                            {SUBCARPETAS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Archivo
                        </label>
                        <label
                            className={`flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                } ${isSaving ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <input
                                type="file"
                                className="hidden"
                                disabled={isSaving}
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            {file ? (
                                <>
                                    <FileText className="h-7 w-7 text-blue-500" />
                                    <span className="text-sm font-semibold text-slate-700 px-4 text-center truncate max-w-full">
                                        {file.name}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="h-7 w-7 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Haz clic para elegir un archivo
                                    </span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="flex-1 h-12 rounded-2xl border-2 border-gray-200 font-bold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !file}
                        className="flex-1 h-12 rounded-2xl bg-[#1D3557] hover:bg-[#16283F] font-bold"
                    >
                        {isSaving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                        ) : (
                            'Guardar archivo'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
