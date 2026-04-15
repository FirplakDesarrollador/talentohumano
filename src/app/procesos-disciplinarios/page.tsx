'use client'

import { useState, useEffect, useCallback } from 'react'
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
    SearchX
} from 'lucide-react'
import { toast } from 'sonner'
import { eliminarAcentos } from '@/lib/utils'
import { ADMIN_LEVELS, ADMIN_EMAILS } from '@/lib/constants/roles'

export default function BuscadorProcesosDisciplinariosPage() {
    const router = useRouter()
    const supabase = createClient()

    // Data State
    const [empleados, setEmpleados] = useState<any[]>([])
    const [filteredEmpleados, setFilteredEmpleados] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // UI State
    const [busqueda, setBusqueda] = useState('')
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    // 1. Fetch User and Initial Data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                // Obtener nivel_cargo de la tabla empleados
                const { data: empleado } = await supabase
                    .from('empleados')
                    .select('nivel_cargo')
                    .eq('correo_electronico', user.email!)
                    .maybeSingle()

                let currentLevel = ''
                if ((empleado as any)?.nivel_cargo) {
                    currentLevel = (empleado as any).nivel_cargo
                    const userObj = { ...(empleado as any), correo: user.email, nivelCargo: currentLevel }
                    setCurrentUser(userObj)
                    fetchEmpleados((userObj as any).plantas || [])
                } else {
                    // Fallback a tabla usuarios
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('*')
                        .eq('correo', user.email!)
                        .maybeSingle()
                    
                    if ((profile as any)?.rol) {
                        const roleMap: Record<string, string> = {
                            'admin': 'Administrador',
                            'desarrollador': 'Administrador',
                            'jefe': 'Jefe',
                            'gerente': 'Gerente',
                            'director': 'Director',
                            'coordinador': 'Coordinador',
                            'analista': 'Analista'
                        }
                        currentLevel = roleMap[(profile as any).rol] || (profile as any).rol
                        const userObj = { ...(profile as any), correo: user.email, nivelCargo: currentLevel }
                        setCurrentUser(userObj)
                        fetchEmpleados((userObj as any).plantas || [])
                    } else {
                        fetchEmpleados([])
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error)
                fetchEmpleados([]) 
            }
        }
        fetchUserData()
    }, [supabase, fetchEmpleados])

    // 2. Fetch Empleados
    const fetchEmpleados = useCallback(async (plantas: string[]) => {
        setLoading(true)
        try {
            let query = supabase
                .from('empleados')
                .select('*')
                .eq('activo', true)

            if (plantas && plantas.length > 0) {
                query = query.in('planta', plantas)
            }

            const { data, error } = await query
                .order('nombreCompleto', { ascending: true })

            if (error) throw error
            setEmpleados(data || [])
            setFilteredEmpleados(data || [])
        } catch (err: any) {
            console.error('Error fetching empleados:', err)
            toast.error('No se pudieron cargar los empleados')
        } finally {
            setLoading(false)
        }
    }, [supabase])

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

    // Check if user is admin based on email or level
    const isAdmin = (currentUser?.correo && ADMIN_EMAILS.includes(currentUser.correo)) || 
                    (currentUser?.nivelCargo && ADMIN_LEVELS.includes(currentUser.nivelCargo))

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
                            fetchEmpleados(currentUser?.plantas || [])
                        }}
                        className="h-[42px] px-4 rounded-lg text-gray-500 hover:text-[#1D3557] hover:bg-white border border-gray-200 shadow-sm"
                        title="Refrescar datos"
                    >
                        <Eraser className="h-5 w-5" />
                    </Button>
                </div>

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
                                className="group cursor-pointer transform transition-all duration-200 hover:-translate-y-1 active:scale-[0.98]"
                                onClick={() => router.push(`/procesos-disciplinarios/${empleado.id}`)}
                            >
                                <div className="relative">
                                    <EmpleadoCard empleado={{
                                        ...empleado,
                                        cedula: empleado.id
                                    }} />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <div className="bg-[#1D3557] p-2 rounded-full text-white shadow-lg">
                                            <ChevronRight className="h-5 w-5" />
                                        </div>
                                    </div>
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
            </main>

            <ExportarProcesosModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
            />
        </div>
    )
}
