'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Award, Plus, ArrowLeft } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type CompetenciaEmpleado = any // Cambiado temporalmente de Database['public']['Tables']['competencia_empleado']['Row']

export default function CompetenciasPage() {
    const [competencias, setCompetencias] = useState<CompetenciaEmpleado[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const supabase = createClient()
    const router = useRouter()

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
                .from('ComptEmpleados' as any)
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
            {/* Header */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Gestión de Competencias</h1>
                <div className="w-8" />
            </div>

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
                    <div className="grid grid-cols-1 gap-6">
                        {competencias.map((compRow) => (
                            <Card key={compRow.id} className="overflow-hidden border-none shadow-md bg-white">
                                <CardHeader className="bg-gray-50/50 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#2d4356] flex items-center justify-center text-white">
                                            <Award className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-bold text-[#2d4356]">
                                                {compRow.nombre}
                                            </CardTitle>
                                            <CardDescription className="text-sm font-medium text-gray-500">
                                                {compRow.cargo} • Cédula: {compRow.cedula}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-6">
                                        {Object.keys(compRow.competencias || {}).map((compKey) => {
                                            const nivel = compRow.nivel?.[compKey] || 0;
                                            const esperado = compRow.nivel_esperado?.[compKey] || 4;
                                            const color = getNivelColor(nivel, esperado);
                                            
                                            return (
                                                <div key={compKey} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-bold text-gray-700">{compKey}</h4>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${color}`}>
                                                            {nivel} / {esperado}
                                                        </div>
                                                    </div>
                                                    
                                                    {compRow.comentario?.[compKey] && (
                                                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg italic">
                                                            "{compRow.comentario[compKey]}"
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
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
