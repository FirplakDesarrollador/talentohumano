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
                <div className="bg-[#1e2f3d] text-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/buscador-hilu')}
                            className="text-white hover:text-white hover:bg-white/10 absolute left-4 sm:left-6 lg:left-8"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight">
                            Indicadores
                        </h1>
                    </div>
                </div>
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
                <div className="bg-[#1e2f3d] text-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/buscador-hilu')}
                            className="text-white hover:text-white hover:bg-white/10 absolute left-4 sm:left-6 lg:left-8"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight">
                            Indicadores
                        </h1>
                    </div>
                </div>
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

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#1e2f3d' }}>
            {/* Header */}
            <div className="bg-[#1e2f3d] text-white" style={{ flexShrink: 0, height: '64px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="h-full px-6 flex items-center justify-center relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/buscador-hilu')}
                        className="text-white hover:text-white hover:bg-white/10 absolute left-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold tracking-tight">
                        Indicadores
                    </h1>
                </div>
            </div>

            {/* BI Container */}
            <div style={{ flex: 1, padding: '0' }}>
                <iframe
                    title="BI HILU"
                    width="100%"
                    height="900"
                    src="https://app.powerbi.com/view?r=eyJrIjoiMTgzNzc0YmMtMTc2OC00YzI5LWFiZTAtMWQ1N2E4ZDhmZjgzIiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9"
                    frameBorder="0"
                    allowFullScreen
                    style={{ display: 'block', border: 'none' }}
                />
            </div>
        </div>
    )
}
