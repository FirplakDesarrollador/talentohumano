'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Plus, RotateCcw, Calendar, CheckCircle, Clock, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { SUPERVISORES_MARMOL, SUPERVISORES_CALIDAD, SUPERVISORES_MUEBLES_CEFI, HILU_OPERATIVA_RESTRINGIDA_MOLDES } from '@/lib/constants/roles'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Reentrenamiento = Database['public']['Tables']['reentrenamientos']['Row']

interface ReentrenamientoCardProps {
    empleadoId: number
    cargo: string
    reentrenamientos: Reentrenamiento[]
    onUpdate: () => void
    currentUser?: { id?: number; email?: string; nivelCargo?: string } | null
}

export function ReentrenamientoCard({ empleadoId, cargo, reentrenamientos, onUpdate, currentUser }: ReentrenamientoCardProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const filteredReentrenamientos = useMemo(() =>
        reentrenamientos.filter(r => r.cargo === cargo),
        [reentrenamientos, cargo]
    )

    // Form states
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
    const [fechaFin, setFechaFin] = useState('')
    const [motivo, setMotivo] = useState('')
    const [completado, setCompletado] = useState(false)
    const [comentarios, setComentarios] = useState('')

    const canEdit = () => {
        if (!currentUser) return false
        const email = currentUser.email || ''

        // Estiven Londono and Coordinacion Calidad have full permissions
        if (email === 'estiven.londono@firplak.com' || email === 'coordinacioncalidad@firplak.com') return true

        // Hector specifically CAN edit reentrenamientos
        if (email === 'hector.chinchilla@firplak.com') return true

        // Restricted users cannot edit reentrenamientos
        // (SUPERVISORES_MUEBLES_CEFI SI puede: necesitan agendar reentrenamientos
        // para su personal a cargo)
        if (
            email === 'david.ramirez@firplak.com' ||
            SUPERVISORES_MARMOL.includes(email) ||
            SUPERVISORES_CALIDAD.includes(email) ||
            email === 'jakeline.chaverra@firplak.com' ||
            email === 'maria.perez@firplak.com' ||
            email === 'juliana.ramirez@firplak.com' ||
            email === 'sara.aguilar@firplak.com' ||
            email === 'analistaabastecimiento@firplak.com' ||
            HILU_OPERATIVA_RESTRINGIDA_MOLDES.includes(email)
        ) return false

        return true
    }

    const handleAddReentrenamiento = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await (supabase
                .from('reentrenamientos') as any)
                .insert({
                    empleado_id: empleadoId,
                    cargo: cargo || 'N/A',
                    fecha_inicio: new Date(fechaInicio).toISOString(),
                    fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
                    motivo,
                    completado,
                    comentarios
                })

            if (error) throw error

            toast.success('Reentrenamiento registrado correctamente')
            setIsAdding(false)
            resetForm()
            onUpdate()
        } catch (error) {
            console.error('Error adding retraining:', error)
            toast.error('Error al registrar reentrenamiento')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteReentrenamiento = async (id: number) => {
        const isConfirmed = window.confirm(
            '⚠️ AVISO DE SEGURIDAD\n\n' +
            '¿Desea eliminar este registro de REENTRENAMIENTO?\n\n' +
            'Esta información es crítica para el seguimiento de la capacitación técnica. ' +
            'Si continúa, el dato se borrará definitivamente.'
        );

        if (!isConfirmed) return;

        setLoading(true)
        try {
            const { error } = await supabase
                .from('reentrenamientos')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success('Registro eliminado')
            onUpdate()
        } catch (error) {
            console.error('Error deleting retraining:', error)
            toast.error('Error al eliminar el registro')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFechaInicio(new Date().toISOString().split('T')[0])
        setFechaFin('')
        setMotivo('')
        setCompletado(false)
        setComentarios('')
    }

    return (
        <Card className="shadow-md border-none rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gray-50/50 border-b">
                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-[#1e2f3d]">
                    <RotateCcw className="h-5 w-5 text-orange-600" />
                    Reentrenamientos
                </CardTitle>
                {canEdit() && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAdding(!isAdding)}
                        className={`font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all ${isAdding ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-[#1e2f3d] border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {isAdding ? 'Cancelar' : <><Plus className="h-3 w-3 mr-2" /> Nuevo Registro</>}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-6">
                {isAdding && (
                    <form onSubmit={handleAddReentrenamiento} className="mb-8 p-6 border-2 border-orange-100 rounded-2xl bg-orange-50/30 space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            <h4 className="font-black text-[10px] uppercase tracking-widest text-orange-900">Registrar Reentrenamiento</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fechaInicio" className="text-[10px] font-black uppercase text-gray-400">Fecha Inicio</Label>
                                <Input
                                    id="fechaInicio"
                                    type="date"
                                    required
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="rounded-xl border-gray-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fechaFin" className="text-[10px] font-black uppercase text-gray-400">Fecha Fin (Opcional)</Label>
                                <Input
                                    id="fechaFin"
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="rounded-xl border-gray-200"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="motivo" className="text-[10px] font-black uppercase text-gray-400">Motivo</Label>
                                <Input
                                    id="motivo"
                                    required
                                    placeholder="Ej: Ajuste en el proceso, nuevo procedimiento..."
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="rounded-xl border-gray-200"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${completado ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${completado ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={completado}
                                        onChange={(e) => setCompletado(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-600 group-hover:text-gray-900 transition-colors">Reentrenamiento Completado</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comentarios" className="text-[10px] font-black uppercase text-gray-400">Comentarios</Label>
                            <textarea
                                id="comentarios"
                                className="flex min-h-[100px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-all"
                                placeholder="Observaciones adicionales..."
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest px-8 py-6 rounded-xl shadow-lg transition-all active:scale-95">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Registro'}
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-3">
                    {filteredReentrenamientos.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
                            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sin reentrenamientos</p>
                        </div>
                    ) : (
                        filteredReentrenamientos.map((item) => (
                            <div
                                key={item.id}
                                className="group relative bg-white border border-gray-100 p-5 rounded-[2rem] hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${item.completado ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                                                {item.completado ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo de Formación</p>
                                                <h4 className="text-sm font-black text-[#1e2f3d] uppercase tracking-tight">{item.motivo}</h4>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</p>
                                                <Badge className={`${item.completado ? 'bg-green-500' : 'bg-orange-500'} text-white border-none px-3 py-0.5 rounded-full text-[10px] font-black`}>
                                                    {item.completado ? 'COMPLETADO' : 'EN CURSO'}
                                                </Badge>
                                            </div>
                                            <div className="h-8 w-px bg-gray-100" />
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha Inicio</p>
                                                <p className="text-xs font-black text-gray-600">{item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            {item.fecha_fin && (
                                                <>
                                                    <div className="h-8 w-px bg-gray-100" />
                                                    <div className="flex flex-col">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha Fin</p>
                                                        <p className="text-xs font-black text-gray-600">{item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : 'N/A'}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-10 w-10 rounded-2xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            onClick={() => handleDeleteReentrenamiento(item.id)}
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {item.comentarios && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Comentarios Técnicos</p>
                                        <p className="text-xs text-gray-600 leading-relaxed italic">&quot;{item.comentarios}&quot;</p>
                                    </div>
                                )}

                                <div className="absolute -bottom-4 -right-4 text-gray-50 opacity-20 transform -rotate-12">
                                    <RotateCcw className="h-24 w-24" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

