'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Plus,
    ArrowLeft,
    Users,
    Loader2,
    SortAsc,
    SortDesc,
    Calendar,
    Type,
    ArrowUpDown,
    ExternalLink
} from 'lucide-react'
import { EmpleadoCardGestor } from '@/components/Gestor/EmpleadoCardGestor'
import { GestorFilters, PLANTAS } from '@/components/Gestor/GestorFilters'
import { ROLES, ADMIN_ROLES } from '@/lib/constants/roles'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/types'

type Empleado = Database['public']['Tables']['empleados']['Row']

export default function GestorPersonalPage() {
    const router = useRouter()
    const supabase = createClient()

    // Auth State
    const [user, setUser] = useState<any>(null)
    const [userRole, setUserRole] = useState<string>('')

    // Data State
    const [empleados, setEmpleados] = useState<Empleado[]>([])
    const [jefes, setJefes] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    // UI State
    const [busqueda, setBusqueda] = useState('')
    const [selectedJefe, setSelectedJefe] = useState('')
    const [selectedPlanta, setSelectedPlanta] = useState('Todos')
    const [statusActivo, setStatusActivo] = useState(true)
    const [orderDate, setOrderDate] = useState(true) // Default to Date Descending

    // 1. Fetch User and Roles
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const { data: userData } = await supabase
                    .from('usuarios')
                    .select('rol')
                    .eq('correo', user.email!)
                    .single()
                setUserRole((userData as any)?.rol || ROLES.VISITANTE)
            }
        }
        fetchUser()
    }, [supabase])

    // 2. Fetch Initial Data (Jefes)
    useEffect(() => {
        const fetchJefes = async () => {
            const { data } = await supabase
                .from('empleados')
                .select('jefe')
                .not('jefe', 'is', null)
                .eq('activo', true)

            if (data) {
                const uniqueJefes = Array.from(new Set((data as any[]).map(e => e.jefe).filter(Boolean))) as string[]
                setJefes(uniqueJefes.sort())
            }
        }
        fetchJefes()
    }, [supabase])

    // 3. Filtering Logic (Replicating Flutter criteria)
    const filterByRole = useCallback((empleado: Empleado) => {
        if (!user || !userRole) return false

        // Admin / Dev / Special User Case
        if (userRole === ROLES.ADMIN || userRole === ROLES.DESARROLLADOR || user.email === 'diana.morales@firplak.com') {
            return true
        }

        const area = empleado.planta || ''

        // Jefe Cases
        if (userRole === ROLES.JEFE) {
            const jefeAreas = ['Calidad', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura', 'Marmol sintetico', 'Mercadeo', 'Muebles', 'Produccion', 'RR Moldes', 'Moldes', 'RTM']
            return jefeAreas.includes(area)
        }

        // Supervisor Cases
        if (userRole === ROLES.SUPERVISOR) {
            const supervisorAreas = ['Calidad', 'Fibra de vidrio', 'Muebles', 'RR Moldes', 'Produccion', 'Cefi', 'RTM', 'Marmol sintetico', 'Moldes']
            return supervisorAreas.includes(area)
        }

        // Special Emails Set 1 (From Flutter)
        const teamA = ['hector.chinchilla@firplak.com', 'juliana.ramirez@firplak.com', 'jakeline.chaverra@firplak.com', 'maria.perez@firplak.com', 'estiven.londono@firplak.com', 'sara.aguilar@firplak.com', 'coordinacioncalidad@firplak.com']
        if (teamA.includes(user.email)) {
            const teamAAreas = ['Calidad', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura', 'Marmol sintetico', 'Moldes', 'Muebles', 'Produccion', 'RR Moldes', 'RTM']
            return teamAAreas.includes(area)
        }

        // Team B (Supply/Logistics)
        const teamB = ['analistaabastecimiento@firplak.com', 'almacen@firplak.com', 'arley.taborda@firplak.com']
        if (teamB.includes(user.email)) {
            return area === 'Almacen' || area === 'CEDI'
        }

        // Team C (Quality Supervisors)
        const teamC = ['supervisorcalidad3@firplak.com', 'supervisorcalidad2@firplak.com']
        if (teamC.includes(user.email)) {
            return area === 'Calidad'
        }

        return false // Default access
    }, [user, userRole])

    // 4. Update Filter Criteria (Planta drop-down) based on role
    // (Optional enhancement but let's keep the filter list clean for them)
    // Actually, Flutter code shows all options but filters the actual results.

    // 5. Fetch and Filter Results
    const fetchEmpleados = useCallback(async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('empleados')
                .select('*')
                .eq('activo', statusActivo)

            // Database sorting
            if (orderDate) {
                query = query.order('primer_ingreso', { ascending: false }) // Show newest first
            } else {
                query = query.order('nombreCompleto', { ascending: true })
            }

            const { data, error } = await query
            if (error) throw error

            let filtered = data as Empleado[]

            // Apply Role-Based Visibility
            filtered = filtered.filter(filterByRole)

            // Apply Search
            if (busqueda) {
                const b = busqueda.toLowerCase()
                filtered = filtered.filter(e =>
                    e.nombreCompleto.toLowerCase().includes(b) ||
                    (e.cedula?.toString() || e.id?.toString() || '').includes(b) ||
                    (e.cargo || '').toLowerCase().includes(b)
                )
            }

            // Apply Jefe Filter
            if (selectedJefe) {
                filtered = filtered.filter(e => e.jefe === selectedJefe)
            }

            // Apply Planta Filter
            if (selectedPlanta !== 'Todos') {
                if (selectedPlanta === 'Administrativa ') {
                    const adminAreas = ['I+D+I', 'Ingenieria', 'Servicios', 'TI', 'Talento y Cultura', 'Comercial', 'Contabilidad', 'Financiera', 'Negociacion y compras', 'Legal']
                    filtered = filtered.filter(e => adminAreas.includes(e.planta || ''))
                } else {
                    filtered = filtered.filter(e => e.planta === selectedPlanta)
                }
            }

            setEmpleados(filtered)
        } catch (error: any) {
            console.error('Error fetching data:', error)
            toast.error('Error al cargar empleados: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [supabase, busqueda, selectedJefe, selectedPlanta, statusActivo, orderDate, filterByRole])

    useEffect(() => {
        if (user && userRole) {
            fetchEmpleados()
        }
    }, [fetchEmpleados, user, userRole])

    const handleClearFilters = () => {
        setBusqueda('')
        setSelectedJefe('')
        setSelectedPlanta('Todos')
        setStatusActivo(true)
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg tracking-wide">
                    Gestor de Personal
                </div>
                <div className="w-8" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Search and Filters */}
                <GestorFilters
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    jefes={jefes}
                    selectedJefe={selectedJefe}
                    onJefeChange={setSelectedJefe}
                    selectedPlanta={selectedPlanta}
                    onPlantaChange={setSelectedPlanta}
                    status={statusActivo}
                    onStatusChange={setStatusActivo}
                    onClear={handleClearFilters}
                />

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => router.push('/gestor-de-personal/nuevo')}
                            className="bg-[#1e2f3d] hover:bg-[#2d4356] text-white flex items-center gap-2 px-6 rounded-xl shadow-md h-11"
                        >
                            <Plus className="h-5 w-5" />
                            Agregar Empleado
                        </Button>

                        {ADMIN_ROLES.includes(userRole as any) && (
                            <Button
                                variant="outline"
                                onClick={() => { }} // TODO: Modal cargos
                                className="border-gray-200 text-gray-700 hover:bg-white flex items-center gap-2 px-6 rounded-xl h-11"
                            >
                                <ExternalLink className="h-5 w-5 text-blue-500" />
                                Gestionar Cargos
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 h-11 px-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                            Ordenar por:
                        </span>
                        <Button
                            variant="ghost"
                            onClick={() => setOrderDate(!orderDate)}
                            className={`h-9 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${orderDate ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {orderDate ? <Calendar className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                            {orderDate ? 'FECHA INGRESO' : 'NOMBRE'}
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </div>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    <div className="bg-[#1e2f3d]/5 px-6 py-3 rounded-xl border border-[#1e2f3d]/10 flex items-center">
                        <Users className="h-4 w-4 text-[#1e2f3d] mr-2" />
                        <span className="text-sm font-medium text-[#1e2f3d]">Empleados encontrados: </span>
                        <span className="ml-2 bg-[#1e2f3d] text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                            {empleados.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-50 shadow-sm">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                            <p className="text-gray-400 font-medium">Cargando directorio de personal...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {empleados.length === 0 ? (
                                <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-medium italic">No se encontraron resultados con los filtros aplicados</p>
                                </div>
                            ) : (
                                empleados.map((empleado) => (
                                    <EmpleadoCardGestor
                                        key={empleado.id}
                                        empleado={empleado as any}
                                        onEdit={() => router.push(`/gestor-de-personal/editar/${empleado.id}`)}
                                        canEdit={userRole !== ROLES.VISITANTE && userRole !== ROLES.SUPERVISOR} // Adjusted based on profile
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
