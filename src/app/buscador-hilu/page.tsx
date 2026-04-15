'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { ADMIN_LEVELS, ADMIN_EMAILS } from '@/lib/constants/roles'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, BarChart3, Loader2, ArrowLeft, Eraser } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { EmpleadoCardHILU } from '@/components/HILU/EmpleadoCardHILU'
import type { Database } from '@/lib/supabase/types'

type EmpleadoHILU = Database['public']['Views']['query_estado_hilu']['Row']

export default function BuscadorHiluPage() {
    const router = useRouter()
    const [empleados, setEmpleados] = useState<EmpleadoHILU[]>([])
    const [busqueda, setBusqueda] = useState('')
    const [loading, setLoading] = useState(true)

    // Filters
    const [plantas, setPlantas] = useState<string[]>([])
    const [selectedPlanta, setSelectedPlanta] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('activo') // 'all', 'activo', 'inactivo'
    const [isInitialized, setIsInitialized] = useState(false)
    const [userLevel, setUserLevel] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')

    const supabase = useMemo(() => createClient(), [])

    // Load filters from localStorage on mount
    useEffect(() => {
        const savedPlanta = localStorage.getItem('hilu_selectedPlanta')
        const savedStatus = localStorage.getItem('hilu_selectedStatus')
        const savedBusqueda = localStorage.getItem('hilu_busqueda')

        if (savedPlanta) setSelectedPlanta(savedPlanta)
        if (savedStatus) setSelectedStatus(savedStatus)
        if (savedBusqueda) setBusqueda(savedBusqueda)
        
        setIsInitialized(true)
    }, [])

    // Save filters to localStorage when they change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('hilu_selectedPlanta', selectedPlanta)
            localStorage.setItem('hilu_selectedStatus', selectedStatus)
            localStorage.setItem('hilu_busqueda', busqueda)
        }
    }, [selectedPlanta, selectedStatus, busqueda, isInitialized])

    // Fetch user context
    useEffect(() => {
        const fetchUser = async () => {
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
                        const roleMap: Record<string, string> = {
                            'admin': 'Jefe',
                            'desarrollador': 'Jefe',
                            'jefe': 'Jefe',
                            'gerente': 'Gerente',
                            'director': 'Director',
                            'coordinador': 'Coordinador',
                            'analista': 'Analista'
                        }
                        setUserLevel(roleMap[(profile as any).rol] || (profile as any).rol)
                    }
                }
            }
        }
        fetchUser()
    }, [supabase])

    const fetchFilters = useCallback(async () => {
        try {
            // Fetch unique Plantas
            const { data: plantasData } = await supabase
                .from('query_estado_hilu')
                .select('planta')
                .not('planta', 'is', null) as { data: { planta: string | null }[] | null }

            if (plantasData) {
                const uniquePlantas = Array.from(new Set(plantasData.map(p => p.planta).filter(Boolean))) as string[]
                // Filter out commercial and also JSON/Object strings from SharePoint
                setPlantas(uniquePlantas
                    .filter(p => !p.toLowerCase().includes('comercial'))
                    .filter(p => !p.startsWith('{'))
                    .sort()
                )
            }
        } catch (error) {
            console.error('Error fetching filters:', error)
        }
    }, [supabase])

    const fetchEmpleados = useCallback(async () => {
        if (!isInitialized) return;
        setLoading(true)
        try {
            let query = supabase
                .from('query_estado_hilu')
                .select('*')
                .not('planta', 'ilike', '%comercial%')

            // Filter by Status
            if (selectedStatus !== 'all') {
                query = query.eq('activo', selectedStatus === 'activo')
            }

            // Filter by Planta
            if (selectedPlanta && selectedPlanta !== 'all') {
                query = query.eq('planta', selectedPlanta)
            }

            // Search by name or cedula
            if (busqueda) {
                const isNumeric = /^\d+$/.test(busqueda)
                if (isNumeric) {
                    query = query.or(`nombreCompleto.ilike.%${busqueda}%,id.eq.${busqueda}`)
                } else {
                    query = query.ilike('nombreCompleto', `%${busqueda}%`)
                }
            }

            // Filter out management positions (same logic as Flutter code)
            query = query.order('nombreCompleto', { ascending: true })

            const { data, error } = await query

            if (error) throw error

            setEmpleados(data as EmpleadoHILU[])
        } catch (error) {
            console.error('Error fetching empleados:', error)
        } finally {
            setLoading(false)
        }
    }, [isInitialized, selectedStatus, selectedPlanta, busqueda, supabase])

    const isSystemAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || ADMIN_LEVELS.includes(userLevel as any)
    const canSeeHilu = isSystemAdmin || ['Jefe', 'Coordinador', 'Director', 'Gerente', 'Analista'].includes(userLevel)

    useEffect(() => {
        const handleFocus = () => {
            if (isInitialized) {
                fetchFilters()
                fetchEmpleados()
            }
        }
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [fetchFilters, fetchEmpleados, isInitialized])

    useEffect(() => {
        if (isInitialized) {
            fetchFilters()
        }
    }, [fetchFilters, isInitialized])

    useEffect(() => {
        if (isInitialized) {
            fetchEmpleados()
        }
    }, [fetchEmpleados, isInitialized])

    if (isInitialized && !loading && !canSeeHilu) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <BarChart3 className="h-16 w-16 text-red-500 mx-auto mb-4 opacity-20" />
                    <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                    <p className="text-gray-600 mb-6">
                        No tienes permisos suficientes para acceder al buscador HILU.
                    </p>
                    <Button onClick={() => router.push('/menu')} className="w-full">
                        Volver al inicio
                    </Button>
                </div>
            </div>
        )
    }

    const handleEmpleadoClick = (empleado: EmpleadoHILU) => {
        router.push(`/entrenamiento/${empleado.id}`)
    }

    const handleClearFilters = () => {
        setBusqueda('')
        setSelectedPlanta('all')
        setSelectedStatus('activo')
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg tracking-wide">
                    Entrenamiento
                </div>
                <div className="w-8" /> {/* Spacer for balance */}
            </div>

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row items-end gap-4 mb-6">
                    <div className="w-full sm:w-48">
                        <Label className="mb-2 block text-xs font-bold text-gray-500 pl-1">Estado</Label>
                        <div className="relative">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Retirado</option>
                                <option value="all">Todos</option>
                            </select>
                        </div>
                    </div>

                    <div className="w-full sm:w-56">
                        <Label className="mb-2 block text-xs font-bold text-gray-500 pl-1">Planta</Label>
                        <div className="relative">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                value={selectedPlanta}
                                onChange={(e) => setSelectedPlanta(e.target.value)}
                            >
                                <option value="all">Todas las plantas</option>
                                {plantas.map((planta) => (
                                    <option key={planta} value={planta}>{planta}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <Label htmlFor="search" className="mb-2 block text-xs font-bold text-gray-500 pl-1">Búsqueda avanzada</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="search"
                                    type="text"
                                    placeholder="Nombre, cédula o cargo..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="h-10 border-gray-200 pl-4 pr-4 bg-white focus-visible:ring-1 focus-visible:ring-gray-300"
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="h-10 w-10 p-0 border-gray-200 text-gray-600"
                                onClick={() => { }}
                            >
                                <Search className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleClearFilters}
                                className="h-10 w-10 p-0 border-gray-200 text-yellow-500 hover:text-yellow-600"
                            >
                                <Eraser className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results Bar */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-[#1e2f3d] text-white px-6 py-2.5 rounded-md flex-1 shadow-sm flex items-center">
                        <span className="font-light text-sm mr-2 text-gray-300">Empleados encontrados: </span>
                        <span className="font-bold text-sm tracking-wider">{empleados.length}</span>
                    </div>

                    <Button
                        onClick={() => router.push('/indicadores-hilu')}
                        className="bg-[#facc15] hover:bg-[#eab308] text-white h-[42px] px-0 w-[42px] rounded-md shadow-sm"
                        title="Indicadores"
                    >
                        <BarChart3 className="h-6 w-6" />
                    </Button>
                </div>

                {/* Results List */}
                {loading ? (
                    <div className="text-center py-20">
                        <Loader2 className="inline-block animate-spin h-10 w-10 text-gray-400 mb-4" />
                        <p className="text-gray-500">Cargando...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {empleados.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 border border-dashed rounded-lg">
                                <p>No se encontraron resultados</p>
                            </div>
                        ) : (
                            empleados.map((empleado) => (
                                <EmpleadoCardHILU
                                    key={empleado.id}
                                    empleado={empleado}
                                    onClick={() => handleEmpleadoClick(empleado)}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
