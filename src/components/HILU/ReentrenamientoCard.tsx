'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { Plus, RotateCcw, Calendar, CheckCircle, Clock } from 'lucide-react'

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

    // Form states
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
    const [fechaFin, setFechaFin] = useState('')
    const [motivo, setMotivo] = useState('')
    const [completado, setCompletado] = useState(false)
    const [comentarios, setComentarios] = useState('')

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

            alert('Reentrenamiento registrado correctamente')
            setIsAdding(false)
            resetForm()
            onUpdate()
        } catch (error) {
            console.error('Error adding retraining:', error)
            alert('Error al registrar reentrenamiento')
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
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50 border-b">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-orange-600" />
                    Reentrenamientos
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                    className={isAdding ? 'bg-red-50 text-red-600 border-red-200' : ''}
                >
                    {isAdding ? 'Cancelar' : <><Plus className="h-4 w-4 mr-2" /> Nuevo Registro</>}
                </Button>
            </CardHeader>
            <CardContent className="p-6">
                {isAdding && (
                    <form onSubmit={handleAddReentrenamiento} className="mb-8 p-4 border rounded-lg bg-orange-50/50 space-y-4">
                        <h4 className="font-semibold text-orange-900 mb-2">Registrar Reentrenamiento</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                                <Input
                                    id="fechaInicio"
                                    type="date"
                                    required
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fechaFin">Fecha Fin (Opcional)</Label>
                                <Input
                                    id="fechaFin"
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="motivo">Motivo</Label>
                                <Input
                                    id="motivo"
                                    required
                                    placeholder="Ej: Cambio de estándar, Problema de calidad..."
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={completado}
                                        onChange={(e) => setCompletado(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="font-medium text-gray-700">Reentrenamiento Completado</span>
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comentarios">Comentarios</Label>
                            <textarea
                                id="comentarios"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Observaciones adicionales..."
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar Registro'}
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {reentrenamientos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No hay reentrenamientos registrados</p>
                        </div>
                    ) : (
                        reentrenamientos.map((item) => (
                            <div key={item.id} className="p-4 rounded-lg border bg-white flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            {item.motivo}
                                        </h3>
                                        {item.completado ? (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium border border-green-200">
                                                <CheckCircle className="h-3 w-3" /> Completado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-200">
                                                <Clock className="h-3 w-3" /> Pendiente
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                        <span className="font-medium">Inicio:</span> {new Date(item.fecha_inicio || '').toLocaleDateString()}
                                        {item.fecha_fin && (
                                            <>
                                                <span className="mx-2 text-gray-300">|</span>
                                                <span className="font-medium">Fin:</span> {new Date(item.fecha_fin).toLocaleDateString()}
                                            </>
                                        )}
                                    </div>
                                    {item.comentarios && (
                                        <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded italic">
                                            {item.comentarios}
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
