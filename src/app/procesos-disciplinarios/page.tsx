'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmpleadoCard } from '@/components/EmpleadoCard'
import { ExportarProcesosModal } from '@/components/Disciplinarios/ExportarProcesosModal'
import {
    Search,
    Eraser,
    Loader2,
    ArrowLeft,
    FileSpreadsheet,
    Users,
    ShieldAlert,
    ChevronRight,
    SearchX,
    Clock,
    CheckCircle2,
    ClipboardList
} from 'lucide-react'
import { toast } from 'sonner'
import { eliminarAcentos } from '@/lib/utils'
import { ADMIN_LEVELS, ADMIN_EMAILS, RESTRICTED_SUPERVISORS, COORDINADORES_CON_ACCESO, JEFES_CON_ACCESO, JEFES_MUEBLES_CEFI, JEFES_ALMACEN_CEDI, JEFES_INGENIERIA_MOLDES, DIRECTORES_CON_ACCESO, ANALISTAS_CON_ACCESO, getPlantasPermitidas, PROCESOS_DISCIPLINARIOS_LEVELS, PROCESOS_DISCIPLINARIOS_EMAILS } from '@/lib/constants/roles'
import { resolveUserProfile } from '@/lib/auth/resolveUserProfile'

export default function BuscadorProcesosDisciplinariosPage() {
    const router = useRouter()
    const supabase = createClient()

    // Data State
    const [empleados, setEmpleados] = useState<any[]>([])
    const [filteredEmpleados, setFilteredEmpleados] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<{ correo?: string; nivelCargo?: string; nombre?: string } | null>(null)
    const [isRestricted, setIsRestricted] = useState(false)
    const [isAnalista, setIsAnalista] = useState(false)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

    // UI State
    const [busqueda, setBusqueda] = useState('')
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'empleados' | 'procesos'>('empleados')

    // Procesos (cross-employee) State
    const [procesos, setProcesos] = useState<any[]>([])
    const [loadingProcesos, setLoadingProcesos] = useState(true)
    const [busquedaPendientes, setBusquedaPendientes] = useState('')
    const [busquedaFinalizados, setBusquedaFinalizados] = useState('')

    // 2. Fetch Empleados
    const fetchEmpleados = useCallback(async (userProfile: any) => {
        setLoading(true)
        try {
            // Fetch the whole roster (activos + retirados) once. We need it in memory anyway
            // to walk the jefe -> nombreCompleto chain (jefe de jefe, etc.), so filtering
            // happens client-side below instead of via a single-level SQL "jefe.eq" match.
            // Los retirados se excluyen despues para la pestana de Empleados, pero se
            // mantienen para poder listar sus procesos disciplinarios en la pestana Procesos.
            const { data, error } = await supabase
                .from('empleados')
                .select('*')
                .order('nombreCompleto', { ascending: true })

            if (error) throw error
            let result = (data || []) as any[]

            if (userProfile) {
                const isAdmin = ADMIN_EMAILS.includes(userProfile.correo) || (ADMIN_LEVELS as any).includes(userProfile.nivelCargo);
                const isAnalyst = ANALISTAS_CON_ACCESO.includes(userProfile.correo);

                if (!isAdmin && !isAnalyst) {
                    const plantas = getPlantasPermitidas(userProfile.correo);
                    // For specific users like estiven.londono or hector.chinchilla, getPlantasPermitidas returns null
                    // meaning they have access to all plants (null means no restriction for them in Gestor).
                    const fullAccessEmails = ['hector.chinchilla@firplak.com', 'estiven.londono@firplak.com'];

                    if (!fullAccessEmails.includes(userProfile.correo)) {
                        const nombreABuscar = userProfile.nombre || userProfile.nombreCompleto || '';
                        const normalize = (s: string) => (s || '').trim().toLowerCase();

                        // Walk the full chain of command downward: start with the current user
                        // and keep adding anyone whose jefe is already in the set, so a director
                        // sees not only their direct reports but also the reports of jefes who
                        // report to them (jefe de jefe), at any depth.
                        const chainNames = new Set<string>([normalize(nombreABuscar)]);
                        let expanded = true;
                        while (expanded) {
                            expanded = false;
                            for (const emp of result) {
                                const empJefe = normalize(emp.jefe);
                                const empNombre = normalize(emp.nombreCompleto);
                                if (empJefe && chainNames.has(empJefe) && !chainNames.has(empNombre)) {
                                    chainNames.add(empNombre);
                                    expanded = true;
                                }
                            }
                        }

                        result = result.filter(emp => {
                            if (emp.correo_electronico === userProfile.correo) return true;
                            if (chainNames.has(normalize(emp.nombreCompleto))) return true;
                            if (plantas && plantas.length > 0 && plantas.includes(emp.planta)) return true;
                            return false;
                        });
                    }
                }
            }

            // La pestana de Procesos ve tambien a los retirados; la de Empleados no.
            fetchProcesos(result.map(e => e.id))

            const activos = result.filter(e => e.activo)
            setEmpleados(activos)
            setFilteredEmpleados(activos)
        } catch (err: any) {
            console.error('Error fetching empleados:', err)
            toast.error('No se pudieron cargar los empleados')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    // Trae todos los procesos disciplinarios de los empleados que el usuario
    // puede ver (mismo alcance que la pestana de Empleados), para poder
    // separarlos en Pendientes / Finalizados sin importar a que empleado
    // pertenezcan.
    const fetchProcesos = useCallback(async (empleadoIds: (number | string)[]) => {
        setLoadingProcesos(true)
        try {
            if (empleadoIds.length === 0) {
                setProcesos([])
                return
            }
            const { data, error } = await supabase
                .from('query_procesos_disciplinarios' as any)
                .select('*')
                .in('empleado_id', empleadoIds)
                .order('created_at', { ascending: false })

            if (error) throw error
            setProcesos(data || [])
        } catch (err: any) {
            console.error('Error fetching procesos:', err)
            toast.error('No se pudieron cargar los procesos disciplinarios')
        } finally {
            setLoadingProcesos(false)
        }
    }, [supabase])

    // 1. Fetch User and Initial Data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                // Check Authorization
                const email = user.email!
                const systemAdmin = ADMIN_EMAILS.includes(email)

                // 1. Fetch cargo level (prioriza empleado activo y sigue el vinculo
                // usuarios.empleado_id para correos genericos/compartidos)
                const resolvedProfile = await resolveUserProfile(supabase, email)
                const currentLevel = resolvedProfile.nivelCargo
                const userProfile = currentLevel || resolvedProfile.nombreCompleto
                    ? { correo: email, nivelCargo: currentLevel, nombreCompleto: resolvedProfile.nombreCompleto, nombre: resolvedProfile.nombreCompleto }
                    : null

                setCurrentUser(userProfile)

                // 3. Authorization Check
                const authorized = systemAdmin || PROCESOS_DISCIPLINARIOS_LEVELS.includes(currentLevel as any) || PROCESOS_DISCIPLINARIOS_EMAILS.includes(email) || resolvedProfile.tienePersonalACargo
                setIsAuthorized(authorized)

                if (!authorized) {
                    setLoading(false)
                    return
                }

                // 4. Set legacy flags for UI compatibility
                const analistaAcceso = ANALISTAS_CON_ACCESO.includes(email)
                setIsAnalista(analistaAcceso)
                
                // If authorized, fetch data
                fetchEmpleados(userProfile)

            } catch (error) {
                console.error('Error fetching user data:', error)
                fetchEmpleados(null) 
            }
        }
        fetchUserData()
    }, [supabase, fetchEmpleados])

    const handleToggleEstadoGlobal = async (proceso: any) => {
        const nuevoEstado = proceso.estado === 'PENDIENTE' ? 'FINALIZADO' : 'PENDIENTE'
        try {
            const { error } = await (supabase as any)
                .from('procesos_disciplinarios')
                .update({ estado: nuevoEstado })
                .eq('id', proceso.id)

            if (error) throw error

            toast.success(nuevoEstado === 'FINALIZADO' ? 'Proceso marcado como finalizado' : 'Proceso reabierto como pendiente')
            setProcesos(prev => prev.map(p => p.id === proceso.id ? { ...p, estado: nuevoEstado } : p))
        } catch (err: any) {
            console.error('Error updating estado:', err)
            toast.error('No se pudo actualizar el estado del proceso')
        }
    }

    // 3. Search Logic
    useEffect(() => {
        if (!busqueda) {
            setFilteredEmpleados(empleados)
            return
        }

        const term = eliminarAcentos(busqueda.toLowerCase())
        const filtered = empleados.filter(e =>
            eliminarAcentos(e.nombreCompleto?.toLowerCase() || '').includes(term) ||
            e.id?.toString().includes(term) ||
            e.cedula?.toString().includes(term)
        )
        setFilteredEmpleados(filtered)
    }, [busqueda, empleados])

    const coincideBusqueda = (p: any, termino: string) => {
        if (!termino) return true
        const term = eliminarAcentos(termino.toLowerCase())
        return eliminarAcentos((p.nombreCompleto || '').toLowerCase()).includes(term) ||
            p.empleado_id?.toString().includes(term)
    }
    const procesosPendientes = procesos.filter(p => p.estado === 'PENDIENTE' && coincideBusqueda(p, busquedaPendientes))
    const procesosFinalizados = procesos.filter(p => p.estado !== 'PENDIENTE' && coincideBusqueda(p, busquedaFinalizados))

    const isAdmin = (currentUser?.correo && ADMIN_EMAILS.includes(currentUser.correo)) ||
                    (currentUser?.nivelCargo && (ADMIN_LEVELS as any).includes(currentUser.nivelCargo))

    if (isAuthorized === false) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-black text-[#1D3557] uppercase tracking-tighter mb-2">Acceso No Autorizado</h1>
                <p className="text-gray-500 text-center max-w-md mb-8">
                    Tu cuenta no tiene permisos para acceder al módulo de Procesos Disciplinarios. 
                    Si crees que esto es un error, contacta al administrador.
                </p>
                <Button onClick={() => router.push('/menu')} className="bg-[#1D3557] text-white rounded-xl px-8">
                    Volver al Menú
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">


            {/* Compact Appbar - Standardized */}
            <div className="bg-[#2d4356] h-14 flex items-center px-6 shadow-md text-white sticky top-0 z-40 transition-all">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Procesos Disciplinarios
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button
                            onClick={() => setIsExportModalOpen(true)}
                            className="bg-[#2A9D8F] hover:bg-[#2A9D8F]/90 text-white h-9 px-4 rounded-lg font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm border-none"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Exportar Reporte</span>
                            <span className="md:hidden">Exportar</span>
                        </Button>
                    )}
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 w-fit">
                    <button
                        onClick={() => setActiveTab('empleados')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'empleados' ? 'bg-[#1D3557] text-white shadow-sm' : 'text-gray-500 hover:text-[#1D3557] hover:bg-gray-50'}`}
                    >
                        <Users className="h-4 w-4" /> Empleados
                    </button>
                    <button
                        onClick={() => setActiveTab('procesos')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'procesos' ? 'bg-[#1D3557] text-white shadow-sm' : 'text-gray-500 hover:text-[#1D3557] hover:bg-gray-50'}`}
                    >
                        <ClipboardList className="h-4 w-4" /> Procesos
                        {procesosPendientes.length > 0 && (
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {procesosPendientes.length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'empleados' && (
                    <>
                        {/* Search Bar Row */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#1D3557] transition-colors" />
                                </div>
                                <Input
                                    placeholder="Buscar por nombre o cédula..."
                                    className="pl-12 h-12 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D3557]/10 transition-all text-sm font-medium shadow-sm"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Results Bar */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-[#1D3557] text-white px-6 py-2.5 rounded-lg flex-1 shadow-sm flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="font-light text-sm mr-2 text-blue-200">Empleados encontrados: </span>
                                    <span className="font-bold text-sm tracking-wider">{filteredEmpleados.length}</span>
                                </div>
                                {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-200" />}
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setBusqueda('')
                                    fetchEmpleados(currentUser)
                                }}
                                className="h-[42px] px-4 rounded-lg text-gray-500 hover:text-[#1D3557] hover:bg-white border border-gray-200 shadow-sm"
                                title="Refrescar datos"
                            >
                                <Eraser className="h-5 w-5" />
                            </Button>
                        </div>
                    </>
                )}

                {activeTab === 'procesos' ? (
                    loadingProcesos ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className="h-10 w-10 text-[#1D3557] animate-spin opacity-40" />
                            <p className="text-gray-400 font-medium text-sm animate-pulse">Sincronizando información...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ProcesosColumna
                                titulo="Pendientes"
                                icon={<Clock className="h-4 w-4" />}
                                colorClasses="bg-amber-50 text-amber-600 border-amber-100"
                                procesos={procesosPendientes}
                                isAdmin={!!isAdmin}
                                onToggleEstado={handleToggleEstadoGlobal}
                                onOpen={(empleadoId) => router.push(`/procesos-disciplinarios/${empleadoId}`)}
                                searchValue={busquedaPendientes}
                                onSearchChange={setBusquedaPendientes}
                            />
                            <ProcesosColumna
                                titulo="Finalizados"
                                icon={<CheckCircle2 className="h-4 w-4" />}
                                colorClasses="bg-emerald-50 text-emerald-600 border-emerald-100"
                                procesos={procesosFinalizados}
                                isAdmin={!!isAdmin}
                                onToggleEstado={handleToggleEstadoGlobal}
                                onOpen={(empleadoId) => router.push(`/procesos-disciplinarios/${empleadoId}`)}
                                searchValue={busquedaFinalizados}
                                onSearchChange={setBusquedaFinalizados}
                            />
                        </div>
                    )
                ) : (
                <>
                {/* Results List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <Loader2 className="h-10 w-10 text-[#1D3557] animate-spin opacity-40" />
                        <p className="text-gray-400 font-medium text-sm animate-pulse">Sincronizando información...</p>
                    </div>
                ) : filteredEmpleados.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredEmpleados.map((empleado) => (
                            <div
                                key={empleado.id}
                                className={`group transform transition-all duration-200 ${isAnalista ? 'cursor-default opacity-80' : 'cursor-pointer hover:-translate-y-1 active:scale-[0.98]'}`}
                                onClick={() => !isAnalista && router.push(`/procesos-disciplinarios/${empleado.id}`)}
                            >
                                <div className="relative">
                                    <EmpleadoCard empleado={{
                                        ...empleado,
                                        cedula: empleado.id
                                    }} />
                                    {!isAnalista && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <div className="bg-[#1D3557] p-2 rounded-full text-white shadow-lg">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-gray-200">
                        <div className="bg-gray-50 p-6 rounded-full mb-4">
                            <SearchX className="h-12 w-12 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-[#1D3557]">Sin resultados</h3>
                        <p className="text-gray-400 max-w-xs text-center mt-1 text-sm">
                            No se encontraron empleados activos con los criterios ingresados.
                        </p>
                    </div>
                )}
                </>
                )}
            </main>

            <ExportarProcesosModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
            />
        </div>
    )
}

function ProcesosColumna({ titulo, icon, colorClasses, procesos, isAdmin, onToggleEstado, onOpen, searchValue, onSearchChange }: {
    titulo: string
    icon: ReactNode
    colorClasses: string
    procesos: any[]
    isAdmin: boolean
    onToggleEstado: (proceso: any) => void
    onOpen: (empleadoId: number | string) => void
    searchValue: string
    onSearchChange: (value: string) => void
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${colorClasses}`}>
                {icon}
                <h3 className="font-black uppercase text-xs tracking-widest">{titulo}</h3>
                <span className="ml-auto font-bold text-xs">{procesos.length}</span>
            </div>
            <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar empleado..."
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/10 transition-all"
                    />
                </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                {procesos.length === 0 ? (
                    <div className="py-14 text-center text-gray-400 text-sm">Sin procesos en esta categoría</div>
                ) : (
                    procesos.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => onOpen(p.empleado_id)}
                            className="px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm text-[#1D3557] truncate">{p.nombreCompleto || 'Empleado sin nombre'}</p>
                                    {!p.empleado_activo && (
                                        <span className="shrink-0 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Retirado</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{p.tipo} · {p.motivo || 'Sin motivo'}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">
                                    {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : ''}
                                    {p.planta ? ` · ${p.planta}` : ''}
                                </p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleEstado(p) }}
                                    className={`shrink-0 h-8 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${p.estado === 'PENDIENTE'
                                            ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                            : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                        }`}
                                >
                                    {p.estado === 'PENDIENTE' ? 'Finalizar' : 'Reabrir'}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
