'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Award, Plus } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type CompetenciaEmpleado = Database['public']['Tables']['competencia_empleado']['Row']

export default function CompetenciasPage() {
    const [competencias, setCompetencias] = useState<CompetenciaEmpleado[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const supabase = createClient()

    // Form state
    const [formData, setFormData] = useState({
        cedula: '',
        nombre: '',
        cargo: '',
        comp_codigo: '',
        comp_nombre: '',
        nivel_esperado: 0,
        nivel: 0,
        comentario: '',
    })

    const fetchCompetencias = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('competencia_empleado')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setCompetencias(data || [])
        } catch (error) {
            console.error('Error fetching competencias:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchCompetencias()
    }, [fetchCompetencias])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { error } = await supabase.rpc('upsert_competencia_empleado', {
                p_cedula: parseInt(formData.cedula),
                p_nombre: formData.nombre,
                p_cargo: formData.cargo,
                p_comp_codigo: formData.comp_codigo,
                p_comp_nombre: formData.comp_nombre,
                p_nivel_esperado: parseInt(formData.nivel_esperado.toString()),
                p_nivel: parseInt(formData.nivel.toString()),
                p_comentario: formData.comentario,
            } as any)

            if (error) throw error

            // Reset form and refresh
            setFormData({
                cedula: '',
                nombre: '',
                cargo: '',
                comp_codigo: '',
                comp_nombre: '',
                nivel_esperado: 0,
                nivel: 0,
                comentario: '',
            })
            setShowForm(false)
            fetchCompetencias()
        } catch (error) {
            console.error('Error saving competencia:', error)
            alert('Error al guardar la competencia')
        }
    }

    const getNivelColor = (nivel: number, esperado: number) => {
        const porcentaje = (nivel / esperado) * 100
        if (porcentaje >= 100) return 'bg-green-500'
        if (porcentaje >= 75) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Gestión de Competencias
                        </h1>
                        <p className="text-gray-600">
                            Administra las competencias de los empleados
                        </p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Competencia
                    </Button>
                </div>

                {/* Form */}
                {showForm && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Agregar Competencia de Empleado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Cédula</label>
                                    <Input
                                        type="number"
                                        value={formData.cedula}
                                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Nombre Empleado</label>
                                    <Input
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Cargo</label>
                                    <Input
                                        value={formData.cargo}
                                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Código Competencia</label>
                                    <Input
                                        value={formData.comp_codigo}
                                        onChange={(e) => setFormData({ ...formData, comp_codigo: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Nombre Competencia</label>
                                    <Input
                                        value={formData.comp_nombre}
                                        onChange={(e) => setFormData({ ...formData, comp_nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Nivel Esperado</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={formData.nivel_esperado}
                                        onChange={(e) => setFormData({ ...formData, nivel_esperado: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Nivel Actual</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={formData.nivel}
                                        onChange={(e) => setFormData({ ...formData, nivel: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Comentario</label>
                                    <Input
                                        value={formData.comentario}
                                        onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
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
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {competencias.map((comp) => (
                            <Card key={comp.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                                <Award className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{comp.nombre}</CardTitle>
                                                <CardDescription>
                                                    {comp.cargo} - Cédula: {comp.cedula}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`inline-block px-3 py-1 rounded-full text-white text-sm ${getNivelColor(comp.nivel, comp.nivel_esperado)}`}>
                                                {comp.nivel} / {comp.nivel_esperado}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-sm">
                                            <span className="font-medium">Competencia:</span> {comp.comp_nombre} ({comp.comp_codigo})
                                        </p>
                                        {comp.comentario && (
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Comentario:</span> {comp.comentario}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
