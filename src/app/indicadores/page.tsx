'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Plus } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type EmpleadoIndicador = Database['public']['Tables']['empleado_indicador']['Row']

export default function IndicadoresPage() {
    const [indicadores, setIndicadores] = useState<EmpleadoIndicador[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const supabase = createClient()

    // Form state
    const [formData, setFormData] = useState({
        cedula_empleado: '',
        nombre_empleado: '',
        nombre_indicador: '',
        tipo: '',
        meta: '',
    })

    const fetchIndicadores = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('empleado_indicador')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setIndicadores(data || [])
        } catch (error) {
            console.error('Error fetching indicadores:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchIndicadores()
    }, [fetchIndicadores])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { error } = await supabase
                .from('empleado_indicador')
                .insert({
                    cedula_empleado: parseInt(formData.cedula_empleado),
                    nombre_empleado: formData.nombre_empleado,
                    nombre_indicador: formData.nombre_indicador,
                    tipo: formData.tipo,
                    meta: parseFloat(formData.meta),
                } as any)

            if (error) throw error

            // Reset form and refresh
            setFormData({
                cedula_empleado: '',
                nombre_empleado: '',
                nombre_indicador: '',
                tipo: '',
                meta: '',
            })
            setShowForm(false)
            fetchIndicadores()
        } catch (error) {
            console.error('Error saving indicador:', error)
            alert('Error al guardar el indicador')
        }
    }

    const getTipoColor = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'ventas':
                return 'from-green-500 to-green-600'
            case 'produccion':
            case 'producción':
                return 'from-blue-500 to-blue-600'
            case 'calidad':
                return 'from-purple-500 to-purple-600'
            case 'servicio':
                return 'from-yellow-500 to-yellow-600'
            default:
                return 'from-gray-500 to-gray-600'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Indicadores de Desempeño (KPIs)
                        </h1>
                        <p className="text-gray-600">
                            Gestiona y monitorea los indicadores de los empleados
                        </p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Indicador
                    </Button>
                </div>

                {/* Form */}
                {showForm && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Crear Indicador de Empleado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Cédula Empleado</label>
                                    <Input
                                        type="number"
                                        value={formData.cedula_empleado}
                                        onChange={(e) => setFormData({ ...formData, cedula_empleado: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Nombre Empleado</label>
                                    <Input
                                        value={formData.nombre_empleado}
                                        onChange={(e) => setFormData({ ...formData, nombre_empleado: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Nombre del Indicador</label>
                                    <Input
                                        value={formData.nombre_indicador}
                                        onChange={(e) => setFormData({ ...formData, nombre_indicador: e.target.value })}
                                        required
                                        placeholder="Ej: Ventas mensuales, Productos fabricados, etc."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Tipo</label>
                                    <Input
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                        required
                                        placeholder="Ej: Ventas, Producción, Calidad"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Meta</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.meta}
                                        onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-2 flex gap-2 justify-end">
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit">Guardar</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {indicadores.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-600">No hay indicadores registrados</p>
                            </div>
                        ) : (
                            indicadores.map((indicador) => (
                                <Card key={indicador.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getTipoColor(indicador.tipo)} flex items-center justify-center`}>
                                                <TrendingUp className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base truncate">
                                                    {indicador.nombre_indicador}
                                                </CardTitle>
                                                <CardDescription className="truncate">
                                                    {indicador.nombre_empleado}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Tipo:</span>
                                                <span className="text-sm font-medium">{indicador.tipo}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-sm text-gray-600">Meta:</span>
                                                <span className="text-lg font-bold text-green-600">{indicador.meta}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-sm text-gray-600">Cédula:</span>
                                                <span className="text-sm">{indicador.cedula_empleado}</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
