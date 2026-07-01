'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { ADMIN_LEVELS, ADMIN_EMAILS, NIVELES_CARGO } from '@/lib/constants/roles'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, BarChart3, Loader2, ArrowLeft, Eraser, Calendar, ChevronDown, Check, User, Bell, Clock, ShieldCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { EmpleadoCardHILU } from '@/components/HILU/EmpleadoCardHILU'
import type { Database } from '@/lib/supabase/types'

type EmpleadoHILU = Database['public']['Views']['query_estado_hilu']['Row'] & { adminData?: any }

// Areas that belong to the "Administrativa" virtual group
const AREAS_ADMINISTRATIVAS = [
    'Contabilidad', 'Financiera', 'Legal', 'TI', 'Talento y Cultura',
    'Negociacion y compras', 'Mercadeo', 'Servicios', 'Logistica', 'I+D+I', 'Comercial'
]
export default function BuscadorHiluAdminPage() {
    const router = useRouter()
    const [empleados, setEmpleados] = useState<EmpleadoHILU[]>([])
    const [busqueda, setBusqueda] = useState('')
    const [loading, setLoading] = useState(true)

    // Filters
    const [plantas, setPlantas] = useState<string[]>([])
    const [selectedPlanta, setSelectedPlanta] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('activo') // 'all', 'activo', 'inactivo'
    const [selectedNiveles, setSelectedNiveles] = useState<string[]>([])
    const [isInitialized, setIsInitialized] = useState(false)
    const [isNivelOpen, setIsNivelOpen] = useState(false)
    const nivelDropdownRef = useRef<HTMLDivElement>(null)
    const [userLevel, setUserLevel] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')
    const [userName, setUserName] = useState<string>('')
    const [programaciones, setProgramaciones] = useState<any[]>([])
    const [showProgramaciones, setShowProgramaciones] = useState(false)

    const supabase = useMemo(() => createClient(), [])

    // Load filters from localStorage on mount
    useEffect(() => {
        const savedPlanta = localStorage.getItem('hilu_selectedPlanta')
        const savedStatus = localStorage.getItem('hilu_selectedStatus')
        const savedNiveles = localStorage.getItem('hilu_selectedNiveles')
        const savedBusqueda = localStorage.getItem('hilu_busqueda')

        if (savedPlanta) setSelectedPlanta(savedPlanta)
        if (savedStatus) setSelectedStatus(savedStatus)
        if (savedNiveles) {
            try {
                setSelectedNiveles(JSON.parse(savedNiveles))
            } catch (e) {
                setSelectedNiveles([])
            }
        }
        if (savedBusqueda) setBusqueda(savedBusqueda)

        setIsInitialized(true)
    }, [])

    // Save filters to localStorage when they change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('hilu_selectedPlanta', selectedPlanta)
            localStorage.setItem('hilu_selectedStatus', selectedStatus)
            localStorage.setItem('hilu_selectedNiveles', JSON.stringify(selectedNiveles))
            localStorage.setItem('hilu_busqueda', busqueda)
        }
    }, [selectedPlanta, selectedStatus, selectedNiveles, busqueda, isInitialized])

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
                
                // Fetch Programaciones
                const todayStr = new Date().toISOString().split('T')[0];
                const { data: progData } = await supabase
                    .from('hilu_programacion')
                    .select('*, empleados(nombreCompleto)')
                    .gte('fecha_programada', todayStr)
                    .order('fecha_programada', { ascending: true })
                    .limit(30);
                    
                // If we want to filter by user's plants or instructor, we can do it here.
                // For now, let's just get the upcoming ones. If the user is an instructor, we prioritize those.
                // Let's try to find their name from the profile or employee record
                let fetchedUserName = '';
                if ((empleado as any)?.nombreCompleto) fetchedUserName = (empleado as any).nombreCompleto;
                else if ((empleado as any)?.nombre) fetchedUserName = (empleado as any).nombre;
                
                setUserName(fetchedUserName);

                if (progData) {
                    // Si encontramos su nombre, ponemos primero donde ellos son el instructor
                    const sortedProg = progData.sort((a: any, b: any) => {
                        const aIsMe = fetchedUserName && a.instructor?.toLowerCase().includes(fetchedUserName.toLowerCase());
                        const bIsMe = fetchedUserName && b.instructor?.toLowerCase().includes(fetchedUserName.toLowerCase());
                        if (aIsMe && !bIsMe) return -1;
                        if (!aIsMe && bIsMe) return 1;
                        return 0;
                    });
                    setProgramaciones(sortedProg);
                }
            }
            setLoading(false)
        }
        fetchUser()
    }, [supabase])

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (nivelDropdownRef.current && !nivelDropdownRef.current.contains(event.target as Node)) {
                setIsNivelOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const isSystemAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || ADMIN_LEVELS.includes(userLevel as any)
    const canSeeHilu = isSystemAdmin || ['Jefe', 'Coordinador', 'Director', 'Gerente', 'Analista', 'Supervisor'].includes(userLevel)

    const fetchFilters = useCallback(async () => {
        try {
            const { data } = await supabase.from('query_estado_hilu').select('area').not('nivelCargo', 'in', '("Operario","Operario lider")');
            if (data) {
                const uniqueAreas = Array.from(new Set((data as any[]).map(d => d.area).filter(Boolean)));
                setPlantas(uniqueAreas.sort() as string[]);
            }
        } catch (error) {
            console.error('Error setting filters:', error)
        }
    }, [supabase])

    const fetchEmpleados = useCallback(async () => {
        if (!isInitialized) return;
        setLoading(true)
        try {
            let query = supabase
                .from('query_estado_hilu')
                .select('*')

            // Filter by Status
            if (selectedStatus !== 'all') {
                query = query.eq('activo', selectedStatus === 'activo')
            }

            // Filter by Nivel de Cargo (Multi-select)
            if (selectedNiveles.length > 0) {
                query = query.in('nivelCargo', selectedNiveles)
            }

            // Filter by "Administrativo" (Base for HILU Administrativa)
            // Include if Area in AREAS_ADMINISTRATIVAS OR NivelCargo in ('Jefe', 'Coordinador', 'Director', 'Gerente', 'Supervisor')
            const adminAreas = AREAS_ADMINISTRATIVAS.map(a => `area.eq.${a}`).join(',')
            query = query.or(`${adminAreas},nivelCargo.in.("Jefe","Coordinador","Director","Gerente","Supervisor")`)

            // --- SISTEMA DE PERMISOS HILU ADMINISTRATIVA ---
            // 1. Los Administradores pueden ver a todos los empleados.
            if (isSystemAdmin) {
                // No se aplica ningún filtro adicional, ven a todos.
            } else {
                // Evaluamos si el usuario actual tiene HILU de Sistemas de Producción
                const normalizedUser = (userName || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, ' ');
                const specialNames = ['hector jose chinchilla', 'hector chinchilla', 'jakeline chaverra', 'sara maria aguilar', 'carlos jose mier', 'ederson estiven', 'juliana ramirez', 'maria isabel escobar'];
                const isSpecialUser = (userLevel || '').toLowerCase().includes('supervisor') || specialNames.some(name => normalizedUser.includes(name));

                // 2. Empleados se ven a sí mismos.
                // 3. Jefes pueden ver a los empleados que tienen a cargo.
                let baseOr = '';
                if (userEmail) {
                    baseOr += `correo_electronico.eq.${userEmail}`;
                }
                if (userName) {
                    baseOr += baseOr ? `,jefe.ilike.%${userName}%` : `jefe.ilike.%${userName}%`;
                }

                // 4. Si tienen HILU Sistemas de Producción, pueden verse entre ellos (supervisores y los empleados especiales).
                if (isSpecialUser) {
                    const specialNamesFilter = specialNames.map(n => `nombreCompleto.ilike.%${n}%`).join(',');
                    const opHiluFilter = `nivelCargo.ilike.%supervisor%,${specialNamesFilter}`;
                    baseOr += baseOr ? `,${opHiluFilter}` : opHiluFilter;
                }

                if (baseOr) {
                    query = query.or(baseOr);
                }
            }
            // ------------------------------------------------

            // Filter by Area
            if (selectedPlanta && selectedPlanta !== 'all') {
                if (selectedPlanta === 'Administrativa') {
                    if (AREAS_ADMINISTRATIVAS.length > 0) {
                        const adminFilter = AREAS_ADMINISTRATIVAS.map(a => `area.eq.${a}`).join(',')
                        query = query.or(adminFilter)
                    } else {
                        query = query.eq('area', '___NONE___')
                    }
                } else {
                    query = query.eq('area', selectedPlanta)
                }
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

            // Order by most recently edited first
            query = query.order('modified_at', { ascending: false, nullsFirst: false })

            const { data, error } = await query

            if (error) throw error

            const empData = data as any[]

            if (empData.length > 0) {
                const ids = empData.map(r => r.id)
                const { data: adminRecords } = await supabase
                    .from('hilu_administrativa')
                    .select('empleado_id, fh_completado, fi_completado, fl_completado')
                    .in('empleado_id', ids)

                const adminMap = new Map()
                if (adminRecords) {
                    adminRecords.forEach((ar: any) => {
                        adminMap.set(ar.empleado_id, ar)
                    })
                }

                const merged = empData.map(r => ({
                    ...r,
                    adminData: adminMap.get(r.id) || null
                }))
                
                setEmpleados(merged as EmpleadoHILU[])
            } else {
                setEmpleados([])
            }
        } catch (error) {
            console.error('Error fetching empleados:', error)
        } finally {
            setLoading(true) // Pre-loader while processing
            setTimeout(() => setLoading(false), 10)
        }
    }, [isInitialized, selectedStatus, selectedNiveles, selectedPlanta, busqueda, supabase, isSystemAdmin, userName, userEmail, userLevel])

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
        router.push(`/hilu-administrativa/${empleado.id}`)
    }

    const handleClearFilters = () => {
        setBusqueda('')
        setSelectedPlanta('all')
        setSelectedStatus('activo')
        setSelectedNiveles([])
    }

    const toggleNivel = (nivel: string) => {
        if (selectedNiveles.includes(nivel)) {
            setSelectedNiveles(selectedNiveles.filter(n => n !== nivel))
        } else {
            setSelectedNiveles([...selectedNiveles, nivel])
        }
    }

    const nivelesOptions = Object.values(NIVELES_CARGO)

    return (
        <div className="min-h-screen bg-white">
            {/* Custom Header */}
            <div className="bg-[#1e2f3d] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.push('/seleccion-hilu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1" />
                
                {/* NOTIFICATIONS BELL */}
                <div className="relative mr-2">
                    <Button 
                        onClick={() => setShowProgramaciones(!showProgramaciones)}
                        variant="ghost" 
                        className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0 relative focus:outline-none"
                    >
                        <Bell className="h-5 w-5" />
                        {programaciones.length > 0 && (
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-[#1e2f3d] animate-pulse"></span>
                        )}
                    </Button>
                    
                    {showProgramaciones && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowProgramaciones(false)} />
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4">
                                <div className="bg-gradient-to-r from-[#1e2f3d] to-[#2c4255] p-4 text-white flex justify-between items-center">
                                    <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-amber-400" /> Mis Entrenamientos
                                    </h3>
                                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-black">{programaciones.length}</span>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto p-2 bg-gray-50/50">
                                    {programaciones.length > 0 ? (
                                        <div className="space-y-2">
                                            {programaciones.map((p, i) => {
                                                const evtDate = new Date(p.fecha_programada + 'T00:00:00');
                                                const dateStr = evtDate.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
                                                return (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => router.push('/programacion-entrenamientos?tipo=administrativa')}
                                                        className="p-3.5 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group cursor-pointer"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                                {p.fase_hilu ? `FASE ${p.fase_hilu}` : p.tipo}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" /> {dateStr}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-black text-[#1e2f3d] leading-tight group-hover:text-blue-600 transition-colors">
                                                            {p.empleados?.nombreCompleto || 'Colaborador'}
                                                        </p>
                                                        <div className="mt-2.5 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                                                <Clock className="h-3 w-3 text-blue-500" /> 
                                                                {p.hora_inicio.substring(0, 5)} - {p.hora_fin.substring(0, 5)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-12 px-6 text-center">
                                            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <ShieldCheck className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-800">Todo al día</p>
                                            <p className="text-xs text-gray-500 mt-1">No tienes entrenamientos programados próximos.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
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
                        <Label className="mb-2 block text-xs font-bold text-gray-500 pl-1">Área</Label>
                        <div className="relative">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                value={selectedPlanta}
                                onChange={(e) => setSelectedPlanta(e.target.value)}
                            >
                                <option value="all">Todas las áreas</option>
                                {plantas.map((area) => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-full sm:w-64 relative" ref={nivelDropdownRef}>
                        <Label className="mb-2 block text-xs font-bold text-gray-500 pl-1 flex items-center gap-1">
                            <User className="h-3 w-3" /> Nivel de Cargo
                        </Label>
                        <button
                            type="button"
                            onClick={() => setIsNivelOpen(!isNivelOpen)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 font-medium"
                        >
                            <span className="truncate">
                                {selectedNiveles.length === 0
                                    ? 'Todos los niveles'
                                    : `${selectedNiveles.length} seleccionado(s)`}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isNivelOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isNivelOpen && (
                            <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white rounded-md shadow-lg border border-gray-100 py-2 z-[60] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                {nivelesOptions.map((nivel) => (
                                    <button
                                        key={nivel}
                                        type="button"
                                        onClick={() => toggleNivel(nivel)}
                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${selectedNiveles.includes(nivel)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white border-gray-300'
                                            }`}>
                                            {selectedNiveles.includes(nivel) && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className={`text-xs font-medium ${selectedNiveles.includes(nivel) ? 'text-blue-600' : 'text-gray-600'
                                            }`}>
                                            {nivel}
                                        </span>
                                    </button>
                                ))}
                                {selectedNiveles.length > 0 && (
                                    <div className="border-t border-gray-50 mt-1 pt-1 px-2">
                                        <button
                                            onClick={() => setSelectedNiveles([])}
                                            className="text-[10px] font-bold text-red-400 hover:text-red-500 p-1 w-full text-center"
                                        >
                                            Limpiar selección
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
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
                            <Button
                                variant="outline"
                                className="h-10 w-10 p-0 border-gray-200 text-blue-600 hover:text-blue-700"
                                onClick={() => router.push('/programacion-entrenamientos?tipo=administrativa')}
                            >
                                <Calendar className="h-5 w-5" />
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
                                    isAdminContext={true}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
