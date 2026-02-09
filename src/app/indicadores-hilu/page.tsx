'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLES } from '@/lib/constants/roles'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Users, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type EmpleadoHILU = Database['public']['Views']['query_estado_hilu']['Row']

export default function IndicadoresHiluPage() {
    const router = useRouter()
    const [empleados, setEmpleados] = useState<EmpleadoHILU[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data, error } = await supabase
                    .from('query_estado_hilu')
                    .select('*')
                    .eq('activo', true)

                if (error) throw error

                // Filter out management positions
                const filteredData = (data || []).filter((emp: EmpleadoHILU) => {
                    const cargo = emp.cargo?.toLowerCase() || ''
                    const excludedRoles = [
                        ROLES.JEFE,
                        ROLES.DIRECTOR,
                        ROLES.COORDINADOR,
                        ROLES.ANALISTA,
                        ROLES.SUPERVISOR,
                        ROLES.GERENTE,
                        'practicante',
                        'senior',
                        'aprendiz'
                    ]
                    return !excludedRoles.some(role => cargo.includes(role))
                })

                setEmpleados(filteredData as EmpleadoHILU[])
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                    <div className="text-center">
                        <Loader2 className="inline-block animate-spin h-12 w-12 text-blue-600 mb-4" />
                        <p className="text-gray-600">Cargando indicadores...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate statistics
    const totalEmpleados = empleados.length
    const faseHCompletada = empleados.filter(e => e.fh_completado).length
    const faseICompletada = empleados.filter(e => e.fi_completado).length
    const faseLCompletada = empleados.filter(e => e.fl_completado).length
    const faseUCompletada = empleados.filter(e => e.fu_completado).length
    const todosCompletos = empleados.filter(e => e.fh_completado && e.fi_completado && e.fl_completado && e.fu_completado).length
    const ultimaAuditoriaAprobada = empleados.filter(e => e.ultima_auditoria === true).length

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/buscador-hilu')}
                        className="mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver al buscador
                    </Button>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Indicadores HILU
                    </h1>
                    <p className="text-gray-600">
                        Métricas y estadísticas del proceso de entrenamiento
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Total Empleados
                            </CardTitle>
                            <Users className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{totalEmpleados}</div>
                            <p className="text-xs text-gray-500 mt-1">Empleados activos en entrenamiento</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                HILU Completo
                            </CardTitle>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{todosCompletos}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {totalEmpleados > 0 ? ((todosCompletos / totalEmpleados) * 100).toFixed(1) : 0}% del total
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Auditorías Aprobadas
                            </CardTitle>
                            <TrendingUp className="h-5 w-5 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{ultimaAuditoriaAprobada}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {totalEmpleados > 0 ? ((ultimaAuditoriaAprobada / totalEmpleados) * 100).toFixed(1) : 0}% del total
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Phase Completion Statistics */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Progreso por Fase</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Fase H */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Fase H - Inducción</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {faseHCompletada} / {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-blue-600 h-3 rounded-full transition-all"
                                        style={{ width: `${totalEmpleados > 0 ? (faseHCompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {totalEmpleados > 0 ? ((faseHCompletada / totalEmpleados) * 100).toFixed(1) : 0}% completado
                                </p>
                            </div>

                            {/* Fase I */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Fase I - Entrenamiento Intensivo</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {faseICompletada} / {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-green-600 h-3 rounded-full transition-all"
                                        style={{ width: `${totalEmpleados > 0 ? (faseICompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {totalEmpleados > 0 ? ((faseICompletada / totalEmpleados) * 100).toFixed(1) : 0}% completado
                                </p>
                            </div>

                            {/* Fase L */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Fase L - Logro</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {faseLCompletada} / {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-yellow-600 h-3 rounded-full transition-all"
                                        style={{ width: `${totalEmpleados > 0 ? (faseLCompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {totalEmpleados > 0 ? ((faseLCompletada / totalEmpleados) * 100).toFixed(1) : 0}% completado
                                </p>
                            </div>

                            {/* Fase U */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Fase U - Utilización</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {faseUCompletada} / {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-purple-600 h-3 rounded-full transition-all"
                                        style={{ width: `${totalEmpleados > 0 ? (faseUCompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {totalEmpleados > 0 ? ((faseUCompletada / totalEmpleados) * 100).toFixed(1) : 0}% completado
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Additional Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información Adicional</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">En Proceso</p>
                                    <p className="text-sm text-gray-600">
                                        {totalEmpleados - todosCompletos} empleados aún en entrenamiento
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">Completados</p>
                                    <p className="text-sm text-gray-600">
                                        {todosCompletos} empleados han completado todas las fases
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
