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
    ArrowUpDown,
    ExternalLink,
    Download,
    Calendar,
    Type
} from 'lucide-react'
import { EmpleadoCardGestor } from '@/components/Gestor/EmpleadoCardGestor'
import { GestorFilters } from '@/components/Gestor/GestorFilters'
import { CargosModal } from '@/components/Gestor/CargosModal'
import { NIVELES_CARGO, ADMIN_LEVELS, ADMIN_EMAILS, APPROVER_LEVELS, RESTRICTED_SUPERVISORS, GESTOR_EXCLUDED_EMAILS, COORDINADORES_CON_ACCESO, JEFES_CON_ACCESO, JEFES_MUEBLES_CEFI, JEFES_ALMACEN_CEDI, JEFES_INGENIERIA_MOLDES, JEFES_MOLDES, DIRECTORES_CON_ACCESO, ANALISTAS_CON_ACCESO, getPlantasPermitidas } from '@/lib/constants/roles'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/types'

type Empleado = Database['public']['Tables']['empleados']['Row']

export default function GestorPersonalPage() {
    const router = useRouter()
    const supabase = createClient()

    // Auth State
    const [user, setUser] = useState<any>(null)
    const [userLevel, setUserLevel] = useState<string>('')

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
    const [isCargosModalOpen, setIsCargosModalOpen] = useState(false)
    const [selectedNiveles, setSelectedNiveles] = useState<string[]>([])

    // 1. Fetch User and Levels
    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                
                // Intentar obtener nivel_cargo directamente de la tabla empleados por correo
                const { data: empleado } = await supabase
                    .from('empleados')
                    .select('nivelCargo')
                    .eq('correo_electronico', user.email!)
                    .maybeSingle()

                if ((empleado as any)?.nivelCargo) {
                    setUserLevel((empleado as any).nivelCargo)
                } else {
                    // Fallback a tabla usuarios
                    const { data: usuario } = await supabase
                        .from('usuarios')
                        .select('rol')
                        .eq('correo', user.email!)
                        .maybeSingle()
                    
                    if ((usuario as any)?.rol) {
                        const roleMap: Record<string, string> = {
                            'admin': 'Jefe',
                            'desarrollador': 'Jefe',
                            'jefe': 'Jefe',
                            'gerente': 'Gerente',
                            'director': 'Director',
                            'coordinador': 'Coordinador',
                            'analista': 'Analista',
                            'supervisor': 'Jefe',
                            'visitante': 'Operario'
                        }
                        setUserLevel(roleMap[(usuario as any).rol] || (usuario as any).rol)
                    }
                }
            }
        }
        fetchUserData()
    }, [supabase])

    // 2. Fetch Initial Data (Jefes)
    useEffect(() => {
        const fetchJefes = async () => {
            // Combina dos fuentes: 1) los valores del campo "jefe" en uso (para no
            // perder nombres de jefes que no tienen fila propia en empleados) y
            // 2) todos los Jefes/Supervisores/Coordinadores/Gerentes/Directores
            // activos, aunque en este momento no tengan ningun reporte directo
            // activo (ej. un supervisor cuyo equipo completo fue retirado).
            const [jefeFieldRes, lideresRes] = await Promise.all([
                supabase.from('empleados').select('jefe').not('jefe', 'is', null).eq('activo', true),
                supabase.from('empleados').select('nombreCompleto').eq('activo', true).in('nivelCargo', [
                    NIVELES_CARGO.JEFE,
                    NIVELES_CARGO.SUPERVISOR,
                    NIVELES_CARGO.COORDINADOR,
                    NIVELES_CARGO.GERENTE,
                    NIVELES_CARGO.DIRECTOR,
                ])
            ])

            const jefesSet = new Set<string>()
            ;(jefeFieldRes.data as any[] | null)?.forEach(e => { if (e.jefe) jefesSet.add(e.jefe) })
            ;(lideresRes.data as any[] | null)?.forEach(e => { if (e.nombreCompleto) jefesSet.add(e.nombreCompleto) })

            setJefes(Array.from(jefesSet).sort())
        }
        fetchJefes()
    }, [supabase])

    // 3. Filtering Logic (Based on userLevel)
    const filterByRole = useCallback((empleado: Empleado) => {
        if (!user) return false

        // NEW: Check if user is explicitly excluded (e.g., Pablo Carrizosa)
        if (user?.email && GESTOR_EXCLUDED_EMAILS.includes(user.email)) {
            return false
        }

        // Admin Power: Full list visibility. Checked before requiring userLevel —
        // some admin accounts are shared mailboxes (e.g. talentos@firplak.com) with
        // no row in empleados or usuarios, so nivelCargo never resolves for them.
        const isSystemAdmin = (user?.email && ADMIN_EMAILS.includes(user.email)) || ADMIN_LEVELS.includes(userLevel as any)

        if (isSystemAdmin) {
            return true
        }

        if (!userLevel) return false

        // Analistas con acceso: can see ALL employees (list only, no edit)
        if (user?.email && ANALISTAS_CON_ACCESO.includes(user.email)) {
            return true
        }

        const area = empleado.planta || ''

        // Jefe / Analista: Broad access to production areas
        // NOTE: Coordinador, JEFES_*, and DIRECTORES_CON_ACCESO are excluded — access is email-based only (see getPlantasPermitidas below)
        const isRestrictedJefe = user?.email && (JEFES_CON_ACCESO.includes(user.email) || JEFES_MUEBLES_CEFI.includes(user.email) || JEFES_ALMACEN_CEDI.includes(user.email) || JEFES_INGENIERIA_MOLDES.includes(user.email))
        const isRestrictedDirector = user?.email && DIRECTORES_CON_ACCESO.includes(user.email)
        if (['Jefe', 'Analista'].includes(userLevel) && !isRestrictedJefe) {
            const productionAreas = ['Calidad', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura', 'Marmol sintetico', 'Mercadeo', 'Muebles', 'Produccion', 'RR Moldes', 'Moldes', 'RTM']
            if (productionAreas.includes(area)) return true
        }

        // Director: broad access unless restricted
        if (userLevel === 'Director' && !isRestrictedDirector) return true

        // Special Teams (limited access by plant list)
        const teamA = ['hector.chinchilla@firplak.com']
        if (teamA.includes(user.email)) {
            const teamAAreas = ['Calidad', 'Cefi', 'Fibra de vidrio', 'Mantenimiento', 'Manufactura', 'Marmol sintetico', 'Moldes', 'Muebles', 'Produccion', 'RR Moldes', 'RTM']
            return teamAAreas.includes(area)
        }

        // General Restricted Supervisors + Coordinadores + Jefes con acceso (centralized helper)
        if (user?.email) {
            // Always allow users to see their own profile
            if (empleado.correo === user.email) return true;
            
            const permittedPlants = getPlantasPermitidas(user.email)
            if (permittedPlants) {
                return permittedPlants.includes(area)
            }
        }

        return false // Default access restricted
    }, [user, userLevel])

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
                query = query.order('primer_ingreso', { ascending: false, nullsFirst: false }) // Newest first, NULLs last
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
                if (selectedPlanta === 'Administrativa') {
                    const adminAreas = [
                        'I+D+I', 'Ingenieria', 'Servicios', 'TI', 'Talento y Cultura', 
                        'Comercial', 'Contabilidad', 'Financiera', 'Negociacion y compras', 'Legal'
                    ]
                    filtered = filtered.filter(e => adminAreas.includes(e.planta || ''))
                } else {
                    filtered = filtered.filter(e => e.planta === selectedPlanta)
                }
            }

            // Apply Niveles Multi-Select Filter
            if (selectedNiveles.length > 0) {
                filtered = filtered.filter(e => selectedNiveles.includes((e as any).nivelCargo || ''))
            }

            setEmpleados(filtered)
        } catch (error: any) {
            console.error('Error fetching data:', error)
            toast.error('Error al cargar empleados: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [supabase, busqueda, selectedJefe, selectedPlanta, statusActivo, orderDate, filterByRole, selectedNiveles])

    useEffect(() => {
        // Also proceed for known admin emails even without a resolved userLevel —
        // shared admin mailboxes (no empleados/usuarios row) would otherwise wait
        // forever and leave the page stuck on the loading spinner.
        const isKnownAdminEmail = !!(user?.email && ADMIN_EMAILS.includes(user.email))
        if (user && (userLevel || isKnownAdminEmail)) {
            fetchEmpleados()
        }
    }, [fetchEmpleados, user, userLevel])

    const handleDownloadExcel = async () => {
        const toastId = toast.loading('Generando archivo Excel...')
        try {
            const { data, error } = await supabase
                .from('empleados')
                .select('*')
                .order('nombreCompleto', { ascending: true })

            if (error) throw error

            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar', { id: toastId })
                return
            }

            // Dynamically import xlsx to keep bundle size smaller for non-admins
            const XLSX = await import('xlsx')
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados')
            
            // Generate filename with current date
            const date = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
            XLSX.writeFile(workbook, `Base_Datos_Empleados_${date}.xlsx`)
            
            toast.success('Archivo Excel descargado correctamente', { id: toastId })
        } catch (error: any) {
            console.error('Error downloading excel:', error)
            toast.error('Error al descargar Excel: ' + error.message, { id: toastId })
        }
    }

    const handleClearFilters = () => {
        setBusqueda('')
        setSelectedJefe('')
        setSelectedPlanta('Todos')
        setStatusActivo(true)
        setSelectedNiveles([])
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
                    selectedNiveles={selectedNiveles}
                    onNivelesChange={setSelectedNiveles}
                />

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {!((user?.email && (RESTRICTED_SUPERVISORS.includes(user.email) || COORDINADORES_CON_ACCESO.includes(user.email) || JEFES_CON_ACCESO.includes(user.email) || JEFES_MUEBLES_CEFI.includes(user.email) || JEFES_ALMACEN_CEDI.includes(user.email) || JEFES_INGENIERIA_MOLDES.includes(user.email) || JEFES_MOLDES.includes(user.email) || DIRECTORES_CON_ACCESO.includes(user.email) || ANALISTAS_CON_ACCESO.includes(user.email)))) && (
                            <Button
                                onClick={() => router.push('/gestor-de-personal/nuevo')}
                                className="bg-[#1e2f3d] hover:bg-[#2d4356] text-white flex items-center gap-2 px-6 rounded-xl shadow-md h-11"
                            >
                                <Plus className="h-5 w-5" />
                                Agregar Empleado
                            </Button>
                        )}

                        {((user?.email && ADMIN_EMAILS.includes(user.email)) || ADMIN_LEVELS.includes(userLevel as any)) && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsCargosModalOpen(true)}
                                    className="border-gray-200 text-gray-700 hover:bg-white flex items-center gap-2 px-6 rounded-xl h-11"
                                >
                                    <ExternalLink className="h-5 w-5 text-blue-500" />
                                    Gestionar Cargos
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleDownloadExcel}
                                    className="border-gray-200 text-gray-700 hover:bg-white flex items-center gap-2 px-6 rounded-xl h-11"
                                >
                                    <Download className="h-5 w-5 text-emerald-600" />
                                    Descargar Excel
                                </Button>
                            </>
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
                                        canEdit={((user?.email && ADMIN_EMAILS.includes(user.email)) || ADMIN_LEVELS.includes(userLevel as any) || APPROVER_LEVELS.includes(userLevel as any)) && !(user?.email && ANALISTAS_CON_ACCESO.includes(user.email))}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>

                <CargosModal 
                    isOpen={isCargosModalOpen}
                    onClose={() => setIsCargosModalOpen(false)}
                />
            </div>
        </div>
    )
}
