'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Plus, Calendar, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

type Auditoria = Database['public']['Tables']['auditorias']['Row']

interface AuditoriaCardProps {
    empleadoId: number
    cargo: string
    auditorias: Auditoria[]
    onUpdate: () => void
}

export function AuditoriaCard({ empleadoId, cargo, auditorias, onUpdate }: AuditoriaCardProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

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

            alert('Auditoría registrada correctamente')
            setIsAdding(false)
            resetForm()
            onUpdate()
        } catch (error) {
            console.error('Error adding audit:', error)
            alert('Error al registrar la auditoría')
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
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50 border-b">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    Auditorías de Estándar
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                    className={isAdding ? 'bg-red-50 text-red-600 border-red-200' : ''}
                >
                    {isAdding ? 'Cancelar' : <><Plus className="h-4 w-4 mr-2" /> Nueva Auditoría</>}
                </Button>
            </CardHeader>
            <CardContent className="p-6">
                {isAdding && (
                    <form onSubmit={handleAddAuditoria} className="mb-8 p-4 border rounded-lg bg-blue-50/50 space-y-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Registrar Nueva Auditoría</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fecha">Fecha de Auditoría</Label>
                                <div className="relative">
                                    <Input
                                        id="fecha"
                                        type="date"
                                        required
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="evaluador">Evaluador</Label>
                                <Input
                                    id="evaluador"
                                    required
                                    placeholder="Nombre del evaluador"
                                    value={evaluador}
                                    onChange={(e) => setEvaluador(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="calificacion">Calificación (0-100)</Label>
                                <Input
                                    id="calificacion"
                                    type="number"
                                    min="0"
                                    max="100"
                                    required
                                    placeholder="85"
                                    value={calificacion}
                                    onChange={(e) => setCalificacion(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="block mb-2">Resultado</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={cumple}
                                            onChange={() => setCumple(true)}
                                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Cumple</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!cumple}
                                            onChange={() => setCumple(false)}
                                            className="h-4 w-4 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">No Cumple</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comentarios">Comentarios</Label>
                            <textarea
                                id="comentarios"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Observaciones de la auditoría..."
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar Auditoría'}
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {auditorias.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No hay auditorías registradas para este empleado</p>
                        </div>
                    ) : (
                        auditorias.map((audit) => (
                            <div key={audit.id} className={`flex flex-col sm:flex-row gap-4 p-4 rounded-lg border ${audit.cumple ? 'border-l-4 border-l-green-500 bg-white' : 'border-l-4 border-l-red-500 bg-red-50/10'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">
                                            {new Date(audit.fecha_auditoria || '').toLocaleDateString()}
                                        </h3>
                                        {audit.cumple ? (
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium border border-green-200">
                                                Cumple
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium border border-red-200">
                                                No Cumple
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mb-2">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" /> Evaluador: {audit.evaluador || 'N/A'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Calificación: {audit.calificacion}%
                                        </span>
                                    </div>
                                    {audit.comentarios && (
                                        <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                                            &quot;{audit.comentarios}&quot;
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
