'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, PlusCircle, X, ShieldAlert } from 'lucide-react'

interface MotivoSancion {
    id: number
    motivo: string
}

interface CrearProcesoModalProps {
    isOpen: boolean
    onClose: () => void
    empleadoId: string | number
    onSuccess: () => void
}

export function CrearProcesoModal({ isOpen, onClose, empleadoId, onSuccess }: CrearProcesoModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [motivos, setMotivos] = useState<MotivoSancion[]>([])
    const [fetchingMotivos, setFetchingMotivos] = useState(false)

    const [tipo, setTipo] = useState<string>('')
    const [motivoId, setMotivoId] = useState<string>('')
    const [comentario, setComentario] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchMotivos()
        }
    }, [isOpen])

    const fetchMotivos = async () => {
        setFetchingMotivos(true)
        try {
            const { data, error } = await supabase
                .from('motivos_sanciones' as any)
                .select('*')
                .order('motivo')

            if (error) throw error
            setMotivos(data || [])
        } catch (error) {
            console.error('Error fetching motivos:', error)
            toast.error('No se pudieron cargar los motivos de sanción')
        } finally {
            setFetchingMotivos(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tipo) return toast.error('Seleccione el tipo de sanción')
        if (tipo !== 'Compromiso' && !motivoId) return toast.error('Seleccione el motivo de la sanción')
        if (!comentario) return toast.error('Ingrese un comentario')

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const dataToSave = {
                tipo,
                comentario,
                created_by: user?.user_metadata?.nombre || user?.email || 'Sistema',
                created_at: new Date().toISOString(),
                motivo_id: tipo === 'Compromiso' ? 19 : parseInt(motivoId),
                empleado_id: empleadoId
            }

            const { error } = await (supabase as any)
                .from('procesos_disciplinarios')
                .insert([dataToSave])

            if (error) throw error

            toast.success('Proceso disciplinario creado correctamente')
            onSuccess()
            onClose()
            // Reset form
            setTipo('')
            setMotivoId('')
            setComentario('')
        } catch (error: any) {
            console.error('Error creating process:', error)
            toast.error('Error al crear el registro: ' + (error.message || 'Error desconocido'))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[28px] w-full max-w-[500px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                {/* Header */}
                <div className="bg-[#1D3557] text-white p-7 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors p-1"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-white/10 p-2.5 rounded-2xl">
                            <ShieldAlert className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Crear proceso</h3>
                            <p className="text-blue-200/70 text-xs font-bold uppercase tracking-widest mt-0.5">
                                Registro Disciplinario
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="space-y-6">
                        {/* Tipo de Sanción */}
                        <div className="space-y-2.5">
                            <Label className="text-[#1D3557] font-black uppercase text-[10px] tracking-[0.2em] ml-1">
                                Tipo de sanción
                            </Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger className="border-2 border-gray-50 bg-gray-50 focus:border-[#1D3557] focus:ring-0 transition-all rounded-2xl h-14 px-5 font-semibold text-[#1D3557]">
                                    <SelectValue placeholder="Seleccione el tipo..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                                    <SelectItem value="Compromiso" className="rounded-xl py-3 font-semibold text-[#1D3557]">Compromiso</SelectItem>
                                    <SelectItem value="Llamado de atencion" className="rounded-xl py-3 font-semibold text-[#1D3557]">Llamado de atención</SelectItem>
                                    <SelectItem value="Descargos" className="rounded-xl py-3 font-semibold text-[#1D3557]">Descargos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Motivo de Sanción (Conditional) */}
                        {tipo && tipo !== 'Compromiso' && (
                            <div className="space-y-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-[#1D3557] font-black uppercase text-[10px] tracking-[0.2em] ml-1">
                                    Motivo de la sanción
                                </Label>
                                <Select value={motivoId} onValueChange={setMotivoId}>
                                    <SelectTrigger className="border-2 border-gray-50 bg-gray-50 focus:border-[#1D3557] focus:ring-0 transition-all rounded-2xl h-14 px-5 font-semibold text-[#1D3557]">
                                        <SelectValue placeholder={fetchingMotivos ? "Cargando motivos..." : "Seleccione el motivo..."} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl p-2 max-h-[300px]">
                                        {motivos.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()} className="rounded-xl py-3 font-semibold text-[#1D3557]">
                                                {m.motivo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Comentarios */}
                        <div className="space-y-3">
                            <Label className="text-[#1D3557] font-black uppercase text-[10px] tracking-[0.2em] ml-1">
                                Comentarios / Detalles
                            </Label>
                            <Textarea
                                placeholder="Suministre información detallada sobre el proceso disciplinario..."
                                className="min-h-[140px] border-2 border-gray-50 bg-gray-50 focus:border-[#1D3557] focus:ring-0 transition-all rounded-[24px] resize-none p-5 text-sm font-medium text-[#1D3557]"
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 font-black uppercase text-[10px] tracking-[0.2em] text-gray-400 hover:text-gray-600 hover:bg-gray-50 h-14 rounded-2xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !tipo || (tipo !== 'Compromiso' && !motivoId) || !comentario}
                            className="bg-[#1D3557] hover:bg-[#1D3557]/90 text-white flex-[2] rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 transition-all active:scale-95"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <PlusCircle className="h-5 w-5" />
                            )}
                            Crear registro
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
