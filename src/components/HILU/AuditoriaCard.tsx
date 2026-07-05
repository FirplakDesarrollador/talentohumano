'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Plus, Calendar, User, CheckCircle2, XCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { SUPERVISORES_MARMOL, SUPERVISORES_CALIDAD, SUPERVISORES_MUEBLES_CEFI, HILU_OPERATIVA_RESTRINGIDA_MOLDES } from '@/lib/constants/roles'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Auditoria = Database['public']['Tables']['auditorias']['Row']

interface AuditoriaCardProps {
    empleadoId: number
    cargo: string
    auditorias: Auditoria[]
    onUpdate: () => void
    currentUser?: { id?: number; email?: string; nivelCargo?: string } | null
}

export function AuditoriaCard({ empleadoId, cargo, auditorias, onUpdate, currentUser }: AuditoriaCardProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const filteredAuditorias = useMemo(() => 
        auditorias.filter(a => a.cargo === cargo),
        [auditorias, cargo]
    )

    const canEdit = () => {
        if (!currentUser) return false
        const email = currentUser.email || ''
        
        // Estiven Londono and Coordinacion Calidad have full permissions
        if (email === 'estiven.londono@firplak.com' || email === 'coordinacioncalidad@firplak.com') return true
        
        // Restricted users cannot edit audits
        if (
            email === 'david.ramirez@firplak.com' || 
            SUPERVISORES_MARMOL.includes(email) || 
            SUPERVISORES_CALIDAD.includes(email) ||
            SUPERVISORES_MUEBLES_CEFI.includes(email) ||
            email === 'jakeline.chaverra@firplak.com' ||
            email === 'maria.perez@firplak.com' ||
            email === 'juliana.ramirez@firplak.com' ||
            email === 'sara.aguilar@firplak.com' ||
            email === 'analistaabastecimiento@firplak.com' ||
            email === 'hector.chinchilla@firplak.com' ||
            HILU_OPERATIVA_RESTRINGIDA_MOLDES.includes(email)
        ) return false
        
        return true
    }

    // Form states
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [evaluador, setEvaluador] = useState('')
    const [calificacion, setCalificacion] = useState('')
    const [cumple, setCumple] = useState(true)
    const [comentarios, setComentarios] = useState('')

    const handleAddAuditoria = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await (supabase
                .from('auditorias') as any)
                .insert({
                    empleado_id: empleadoId,
                    cargo: cargo || 'N/A', // Fallback if cargo is null
                    fecha_auditoria: new Date(fecha).toISOString(),
                    evaluador,
                    calificacion: parseFloat(calificacion),
                    cumple,
                    comentarios
                })

            if (error) throw error

            toast.success('Auditoría registrada correctamente')
            setIsAdding(false)
            resetForm()
            onUpdate()
        } catch (error) {
            console.error('Error adding audit:', error)
            toast.error('Error al registrar la auditoría')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAuditoria = async (id: number) => {
        const isConfirmed = window.confirm(
            '🚨 ATENCIÓN: ELIMINACIÓN DE REGISTRO\n\n' +
            '¿Está absolutamente seguro de que desea eliminar esta AUDITORÍA?\n\n' +
            '• Esta acción es PERMANENTE e irreversible.\n' +
            '• El registro desaparecerá del historial de formación del empleado.\n' +
            '• Esta operación quedará registrada en el sistema.'
        );

        if (!isConfirmed) return;

        setLoading(true)
        try {
            const { error } = await supabase
                .from('auditorias')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success('Auditoría eliminada')
            onUpdate()
        } catch (error) {
            console.error('Error deleting audit:', error)
            toast.error('Error al eliminar la auditoría')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFecha(new Date().toISOString().split('T')[0])
        setEvaluador('')
        setCalificacion('')
        setCumple(true)
        setComentarios('')
    }

    return (
        <Card className="shadow-md border-none rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gray-50/50 border-b">
                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-[#1e2f3d]">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    Auditorías de Estándar
                </CardTitle>
                {canEdit() && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAdding(!isAdding)}
                        className={`font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all ${
                            isAdding ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-[#1e2f3d] border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {isAdding ? 'Cancelar' : <><Plus className="h-3 w-3 mr-2" /> Nueva Auditoría</>}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-6">
                {(isAdding && canEdit()) && (
                    <form onSubmit={handleAddAuditoria} className="mb-8 p-6 border-2 border-blue-100 rounded-2xl bg-blue-50/30 space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <h4 className="font-black text-[10px] uppercase tracking-widest text-blue-900">Registrar Nueva Auditoría</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fecha" className="text-[10px] font-black uppercase text-gray-400">Fecha de Auditoría</Label>
                                <Input
                                    id="fecha"
                                    type="date"
                                    required
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="rounded-xl border-gray-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="evaluador" className="text-[10px] font-black uppercase text-gray-400">Evaluador</Label>
                                <Input
                                    id="evaluador"
                                    required
                                    placeholder="Nombre del evaluador"
                                    value={evaluador}
                                    onChange={(e) => setEvaluador(e.target.value)}
                                    className="rounded-xl border-gray-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="calificacion" className="text-[10px] font-black uppercase text-gray-400">Calificación (0-100)</Label>
                                <Input
                                    id="calificacion"
                                    type="number"
                                    min="0"
                                    max="100"
                                    required
                                    placeholder="85"
                                    value={calificacion}
                                    onChange={(e) => setCalificacion(e.target.value)}
                                    className="rounded-xl border-gray-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Resultado</Label>
                                <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer ${cumple ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-100 text-gray-400'}`}>
                                        <input
                                            type="radio"
                                            checked={cumple}
                                            onChange={() => setCumple(true)}
                                            className="hidden"
                                        />
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase">Cumple</span>
                                    </label>
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer ${!cumple ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-100 text-gray-400'}`}>
                                        <input
                                            type="radio"
                                            checked={!cumple}
                                            onChange={() => setCumple(false)}
                                            className="hidden"
                                        />
                                        <XCircle className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase">No Cumple</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comentarios" className="text-[10px] font-black uppercase text-gray-400">Comentarios</Label>
                            <textarea
                                id="comentarios"
                                className="flex min-h-[100px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                                placeholder="Observaciones de la auditoría..."
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading} className="bg-[#1e2f3d] hover:bg-[#2c4255] text-white font-black uppercase text-[10px] tracking-widest px-8 py-6 rounded-xl shadow-lg transition-all active:scale-95">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Auditoría'}
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {filteredAuditorias.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No hay auditorías registradas</p>
                        </div>
                    ) : (
                        filteredAuditorias.map((audit) => (
                            <div key={audit.id} className="group relative flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 transition-all hover:shadow-md">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${audit.cumple ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {audit.cumple ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-[#1e2f3d] uppercase text-xs tracking-wider">
                                                {new Date(audit.fecha_auditoria || '').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge className={`text-[9px] font-black uppercase py-0 px-2 ${audit.cumple ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                    {audit.cumple ? 'Cumple' : 'No Cumple'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div className="bg-gray-50/50 p-2 rounded-lg">
                                            <label className="text-[8px] font-black text-gray-400 uppercase block">Evaluador</label>
                                            <p className="text-[10px] font-bold text-gray-700 truncate flex items-center gap-1 mt-0.5">
                                                <User className="h-3 w-3 text-blue-500" /> {audit.evaluador || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50/50 p-2 rounded-lg">
                                            <label className="text-[8px] font-black text-gray-400 uppercase block">Calificación</label>
                                            <p className="text-[10px] font-bold text-gray-700 flex items-center gap-1 mt-0.5">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" /> {audit.calificacion}%
                                            </p>
                                        </div>
                                    </div>

                                    {audit.comentarios && (
                                        <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-50">
                                            <p className="text-[11px] text-gray-600 italic leading-relaxed">
                                                &quot;{audit.comentarios}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {canEdit() && (
                                    <div className="flex sm:flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteAuditoria(audit.id)}
                                            className="h-9 w-9 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Eliminar registro"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

