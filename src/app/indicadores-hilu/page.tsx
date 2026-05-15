'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLES, ADMIN_EMAILS, ADMIN_LEVELS } from '@/lib/constants/roles'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Users, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type EmpleadoHILU = Database['public']['Views']['query_estado_hilu']['Row']

// Areas that belong to the "Administrativa" virtual group
const AREAS_ADMINISTRATIVAS = [
    'Contabilidad', 'Financiera', 'Legal', 'TI', 'Talento y Cultura',
    'Negociacion y compras', 'Mercadeo', 'Servicios', 'Logistica', 'I+D+I'
]

export default function IndicadoresHiluPage() {
    const router = useRouter()
    const [allEmpleados, setAllEmpleados] = useState<EmpleadoHILU[]>([])
    const [plantas, setPlantas] = useState<string[]>([])
    const [selectedPlanta, setSelectedPlanta] = useState<string>('all')
    const [loading, setLoading] = useState(true)
    const [userLevel, setUserLevel] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')

    const supabase = createClient()

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                // 1. Fetch User Level
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setUserEmail(user.email || '')
                    const { data: empleado } = await supabase
                        .from('empleados')
                        .select('nivelCargo')
                        .eq('correo_electronico', user.email!)
                        .maybeSingle()

                    if ((empleado as any)?.nivelCargo) {
                        setUserLevel((empleado as any).nivelCargo)
                    } else {
                        const { data: profile } = await supabase
                            .from('usuarios')
                            .select('rol')
                            .eq('correo', user.email!)
                            .maybeSingle()
                        
                        if ((profile as any)?.rol) {
                            const dbRole = (profile as any).rol.toLowerCase()
                            const roleMap: Record<string, string> = {
                                'admin': 'Jefe',
                                'desarrollador': 'Jefe',
                                'jefe': 'Jefe',
                                'gerente': 'Gerente',
                                'director': 'Director',
                                'coordinador': 'Coordinador',
                                'analista': 'Analista',
                                'supervisor': 'Supervisor'
                            }
                            setUserLevel(roleMap[dbRole] || (profile as any).rol)
                        }
                    }
                }

                // 2. Fetch Data
                const { data, error } = await supabase
                    .from('query_estado_hilu')
                    .select('*')
                    .eq('activo', true)

                if (error) throw error

                const rawData = (data as any[]) || []
                
                // Fetch unique areas for filters
                const uniqueAreas = Array.from(new Set(rawData.map(p => p.area).filter(Boolean))) as string[]
                setPlantas(uniqueAreas
                    .filter(a => !AREAS_ADMINISTRATIVAS.includes(a))
                    .filter(a => !a.startsWith('{'))
                    .filter(a => a !== 'Produccion' && a !== 'Todos')
                    .sort()
                )

                setAllEmpleados(rawData as EmpleadoHILU[])
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUserAndData()
    }, [supabase])

    const isSystemAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || ADMIN_LEVELS.includes(userLevel as any)
    const canSeeHilu = isSystemAdmin || ['Jefe', 'Coordinador', 'Director', 'Gerente', 'Analista', 'Supervisor'].includes(userLevel)

    // Filter logic synchronized with BuscadorHilu
    const filteredEmpleados = allEmpleados.filter((emp: EmpleadoHILU) => {
        // First, filter out management positions globally for Indicators
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
        const isExcludedCargo = excludedRoles.some(role => cargo.includes(role))
        if (isExcludedCargo) return false

        // Then apply Area Filter
        if (selectedPlanta === 'all') {
            // Default: show operational staff only (exclude admin areas)
            return !AREAS_ADMINISTRATIVAS.includes(emp.area || '')
        }
        
        if (selectedPlanta === 'Administrativa') {
            return AREAS_ADMINISTRATIVAS.includes(emp.area || '')
        }

        return emp.area === selectedPlanta
    })

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

    if (!canSeeHilu) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                        <TrendingUp className="h-16 w-16 text-red-500 mx-auto mb-4 opacity-20" />
                        <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                        <p className="text-gray-600 mb-6">
                            No tienes permisos suficientes para acceder a los indicadores HILU.
                        </p>
                        <Button onClick={() => router.push('/menu')} className="w-full">
                            Volver al inicio
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate statistics
    const totalEmpleados = filteredEmpleados.length
    const faseHCompletada = filteredEmpleados.filter(e => e.fh_completado).length
    const faseICompletada = filteredEmpleados.filter(e => e.fi_completado).length
    const faseLCompletada = filteredEmpleados.filter(e => e.fl_completado).length
    const faseUCompletada = filteredEmpleados.filter(e => e.fu_completado).length
    const todosCompletos = filteredEmpleados.filter(e => e.fh_completado && e.fi_completado && e.fl_completado && e.fu_completado).length
    const ultimaAuditoriaAprobada = filteredEmpleados.filter(e => e.ultima_auditoria === true).length

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
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

                    <div className="w-full md:w-64">
                        <Label className="mb-2 block text-xs font-bold text-gray-500 pl-1 uppercase tracking-wider">Filtrar por Área</Label>
                        <select
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer transition-all"
                            value={selectedPlanta}
                            onChange={(e) => setSelectedPlanta(e.target.value)}
                        >
                            <option value="all">Personal Operativo (Todas)</option>
                            <option value="Administrativa">Personal Administrativo</option>
                            {plantas.map((area) => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50/50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500">
                                Total Colaboradores
                            </CardTitle>
                            <Users className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-4xl font-black text-[#1e2f3d]">{totalEmpleados}</div>
                            <p className="text-xs text-gray-400 mt-1 font-medium italic">Sujetos a entrenamiento</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50/50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500">
                                HILU Certificado
                            </CardTitle>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-4xl font-black text-[#1e2f3d]">{todosCompletos}</div>
                            <p className="text-xs text-gray-400 mt-1 font-medium">
                                {totalEmpleados > 0 ? ((todosCompletos / totalEmpleados) * 100).toFixed(1) : 0}% efectividad total
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50/50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500">
                                Auditorías OK
                            </CardTitle>
                            <TrendingUp className="h-5 w-5 text-yellow-600" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-4xl font-black text-[#1e2f3d]">{ultimaAuditoriaAprobada}</div>
                            <p className="text-xs text-gray-400 mt-1 font-medium">
                                {totalEmpleados > 0 ? ((ultimaAuditoriaAprobada / totalEmpleados) * 100).toFixed(1) : 0}% cumplimiento
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Phase Completion Statistics */}
                <Card className="mb-8 border-none shadow-sm overflow-hidden bg-white">
                    <CardHeader className="border-b border-gray-50 py-5">
                        <CardTitle className="text-base font-black uppercase tracking-tight text-[#1e2f3d]">Progreso por Fase</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 pb-8">
                        <div className="space-y-8">
                            {/* Fase H */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Fase H - Inducción</span>
                                    <span className="text-sm font-black text-[#1e2f3d]">
                                        {faseHCompletada} <span className="text-gray-300 mx-1">/</span> {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-50 p-1">
                                    <div
                                        className="bg-blue-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                                        style={{ width: `${totalEmpleados > 0 ? (faseHCompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Fase I */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Fase I - Entrenamiento Intensivo</span>
                                    <span className="text-sm font-black text-[#1e2f3d]">
                                        {faseICompletada} <span className="text-gray-300 mx-1">/</span> {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-50 p-1">
                                    <div
                                        className="bg-green-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                                        style={{ width: `${totalEmpleados > 0 ? (faseICompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Fase L */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Fase L - Logro</span>
                                    <span className="text-sm font-black text-[#1e2f3d]">
                                        {faseLCompletada} <span className="text-gray-300 mx-1">/</span> {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-50 p-1">
                                    <div
                                        className="bg-yellow-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                                        style={{ width: `${totalEmpleados > 0 ? (faseLCompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Fase U */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Fase U - Utilización</span>
                                    <span className="text-sm font-black text-[#1e2f3d]">
                                        {faseUCompletada} <span className="text-gray-300 mx-1">/</span> {totalEmpleados}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-50 p-1">
                                    <div
                                        className="bg-purple-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                                        style={{ width: `${totalEmpleados > 0 ? (faseUCompletada / totalEmpleados) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Additional Info */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-50">
                        <CardTitle className="text-base font-black uppercase tracking-tight text-[#1e2f3d]">Resumen de Estatus</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/30 border border-blue-50">
                                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-[#1e2f3d] uppercase text-xs tracking-widest mb-1">En Proceso</p>
                                    <p className="text-sm text-gray-500 font-medium">
                                        <span className="text-blue-600 font-bold">{totalEmpleados - todosCompletos}</span> colaboradores aún en ciclo de formación activa.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-green-50/30 border border-green-50">
                                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-[#1e2f3d] uppercase text-xs tracking-widest mb-1">Certificados</p>
                                    <p className="text-sm text-gray-500 font-medium">
                                        <span className="text-green-600 font-bold">{todosCompletos}</span> colaboradores han cerrado satisfactoriamente el ciclo HILU.
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
