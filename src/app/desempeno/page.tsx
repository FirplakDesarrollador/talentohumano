'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAILS, ADMIN_LEVELS } from '@/lib/constants/roles'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CompetenciaCard } from '@/components/Desempeno/CompetenciaCard'
import { 
    Search, 
    RotateCcw, 
    Loader2, 
    ArrowLeft, 
    Filter,
    Users,
    Building2,
    UserCircle,
    ShieldAlert
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function DesempenoBuscadorPage() {
    const router = useRouter()
    const supabase = createClient()

    // Data State
    const [empleados, setEmpleados] = useState<any[]>([])
    const [filteredEmpleados, setFilteredEmpleados] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [areas, setAreas] = useState<string[]>([])
    const [jefes, setJefes] = useState<string[]>([])
    const [userLevel, setUserLevel] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')
    const [authLoading, setAuthLoading] = useState(true)

    // Filter State
    const [busqueda, setBusqueda] = useState('')
    const [selectedArea, setSelectedArea] = useState('all')
    const [selectedJefe, setSelectedJefe] = useState('all')

    // 1. Fetch Initial Data
    const fetchInitialData = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch all active employees
            const { data: empData, error: empError } = await supabase
                .from('empleados')
                .select('id, nombreCompleto, cargo, planta, jefe, foto, activo')
                .eq('activo', true)
                .order('nombreCompleto', { ascending: true })

            if (empError) throw empError
            setEmpleados(empData || [])
            setFilteredEmpleados(empData || [])

            // Extract unique Areas and Jefes
            const uniqueAreas = Array.from(new Set(empData?.map((e: any) => e.planta).filter(Boolean))) as string[]
            const uniqueJefes = Array.from(new Set(empData?.map((e: any) => e.jefe).filter(Boolean))) as string[]
            
            setAreas(uniqueAreas.sort())
            setJefes(uniqueJefes.sort())

        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchInitialData()

        const fetchUser = async () => {
            setAuthLoading(true)
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
            setAuthLoading(false)
        }
        fetchUser()
    }, [fetchInitialData, supabase])

    // 2. Filter Logic
    useEffect(() => {
        let result = empleados

        // Search filter
        if (busqueda) {
            const term = busqueda.toLowerCase()
            result = result.filter(e => 
                e.nombreCompleto?.toLowerCase().includes(term) ||
                e.id?.toString().includes(term)
            )
        }

        // Area filter
        if (selectedArea !== 'all') {
            result = result.filter(e => e.planta === selectedArea)
        }

        // Jefe filter
        if (selectedJefe !== 'all') {
            result = result.filter(e => e.jefe === selectedJefe)
        }

        setFilteredEmpleados(result)
    }, [busqueda, selectedArea, selectedJefe, empleados])

    // 3. Reset Filters
    const resetFilters = () => {
        setBusqueda('')
        setSelectedArea('all')
        setSelectedJefe('all')
    }

    const isSuperAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail))

    if (!authLoading && !isSuperAdmin) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4 opacity-20" />
                    <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                    <p className="text-gray-600 mb-6">
                        No tienes permisos para acceder al módulo de Desempeño. Solo los super administradores pueden ingresar.
                    </p>
                    <Button onClick={() => router.push('/menu')} className="w-full">
                        Volver al inicio
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8] flex flex-col">
            {/* AppBar */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Módulo de Desempeño
                </div>
                <div className="w-8" />
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Search and Filters Card */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white">
                            <Search className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-[#2d4356]">Buscador de Personal</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Term Search */}
                        <div className="lg:col-span-2 relative">
                            <Input
                                placeholder="Nombre o Cédula..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="pl-10 h-10 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100"
                            />
                            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        </div>

                        {/* Reset Button */}
                        <div className="flex gap-2 lg:col-span-2">
                            <Button 
                                variant="outline" 
                                onClick={resetFilters}
                                className="flex-1 rounded-xl border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider h-10 hover:bg-gray-50"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Limpiar Filtros
                            </Button>
                        </div>

                        {/* Area Selector */}
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 z-10">
                                <Building2 className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <Select value={selectedArea} onValueChange={setSelectedArea}>
                                <SelectTrigger className="pl-10 h-10 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100">
                                    <SelectValue placeholder="Filtrar por Área" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-xl">
                                    <SelectItem value="all">Todas las Áreas</SelectItem>
                                    {areas.map(area => (
                                        <SelectItem key={area} value={area}>{area}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Jefe Selector */}
                        <div className="relative group lg:col-span-3">
                            <div className="absolute left-3 top-2.5 z-10">
                                <UserCircle className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <Select value={selectedJefe} onValueChange={setSelectedJefe}>
                                <SelectTrigger className="pl-10 h-10 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100">
                                    <SelectValue placeholder="Filtrar por Jefe" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-xl">
                                    <SelectItem value="all">Todos los Jefes</SelectItem>
                                    {jefes.map(jefe => (
                                        <SelectItem key={jefe} value={jefe}>{jefe}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500">
                                Empleados: <span className="text-[#2d4356] font-bold">{filteredEmpleados.length}</span>
                            </span>
                        </div>
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin opacity-20" />
                            <p className="text-gray-400 text-sm animate-pulse">Cargando personal...</p>
                        </div>
                    ) : filteredEmpleados.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                            {filteredEmpleados.map((empleado) => (
                                <div key={empleado.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <CompetenciaCard empleado={empleado} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 shadow-sm">
                            <Filter className="h-12 w-12 text-gray-200 mb-4" />
                            <h3 className="text-lg font-bold text-[#2d4356] mb-1">Sin resultados</h3>
                            <p className="text-gray-400 max-w-sm text-sm">
                                No encontramos empleados que coincidan con tu búsqueda o filtros.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
