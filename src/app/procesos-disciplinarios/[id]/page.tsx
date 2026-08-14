'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EmpleadoCard } from '@/components/EmpleadoCard'
import { ProcesoCard } from '@/components/Disciplinarios/ProcesoCard'
import { CrearProcesoModal } from '@/components/Disciplinarios/CrearProcesoModal'
import {
    ArrowLeft,
    Plus,
    History as HistoryIcon,
    Loader2,
    FileText,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'
import {
    ADMIN_LEVELS,
    ADMIN_EMAILS,
    ANALISTAS_CON_ACCESO,
    getPlantasPermitidas,
    PROCESOS_DISCIPLINARIOS_LEVELS,
    PROCESOS_DISCIPLINARIOS_EMAILS,
    SUPERVISORES_MULTI_PLANTA
} from '@/lib/constants/roles'

export default function DetalleProcesosDisciplinarioPage() {
    const router = useRouter()
    const { id } = useParams()
    const supabase = createClient()

    // Data State
    const [empleado, setEmpleado] = useState<any>(null)
    const [procesos, setProcesos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingProceso, setEditingProceso] = useState<any>(null)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

    // 1. Fetch Data
    const fetchData = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            // Fetch Empleado
            const { data: emp, error: empError } = await supabase
                .from('empleados')
                .select('*')
                .eq('id', id)
                .single()

            if (empError) throw empError
            setEmpleado(emp)

            // Fetch History from view
            const { data: proc, error: procError } = await supabase
                .from('query_procesos_disciplinarios' as any)
                .select('*')
                .eq('empleado_id', id)
                .order('created_at', { ascending: false })

            if (procError) {
                console.warn('Error fetching processes from view:', procError)
                // Fallback to table
                const { data: procTable, error: procTableError } = await supabase
                    .from('procesos_disciplinarios' as any)
                    .select('*')
                    .eq('empleado_id', id)
                    .order('created_at', { ascending: false })

                if (procTableError) throw procTableError
                setProcesos(procTable || [])
            } else {
                setProcesos(proc || [])
            }
        } catch (err: any) {
            console.error('Error in DetalleProcesos:', err)
            toast.error('No se pudo cargar el historial')
        } finally {
            setLoading(false)
        }
    }, [supabase, id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Authorization: block direct access to employees the current user isn't allowed to see
    // (mirrors the visibility rules applied in the Procesos Disciplinarios list page).
    useEffect(() => {
        const checkAuthorization = async () => {
            if (!empleado) return
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user?.email) {
                    setIsAuthorized(false)
                    return
                }

                const email = user.email
                const systemAdmin = ADMIN_EMAILS.includes(email)

                const { data: empCurrent } = await supabase
                    .from('empleados')
                    .select('nivelCargo, nombreCompleto')
                    .eq('correo_electronico', email)
                    .maybeSingle()

                let currentLevel = ''
                let nombreActual = ''

                if ((empCurrent as any)?.nivelCargo) {
                    currentLevel = (empCurrent as any).nivelCargo
                    nombreActual = (empCurrent as any).nombreCompleto || ''
                } else {
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('rol, nombre')
                        .eq('correo', email)
                        .maybeSingle()

                    if ((profile as any)?.rol) {
                        const roleMap: Record<string, string> = {
                            'admin': 'Administrador',
                            'desarrollador': 'Administrador',
                            'jefe': 'Jefe',
                            'gerente': 'Gerente',
                            'director': 'Director',
                            'coordinador': 'Coordinador',
                            'analista': 'Analista',
                            'supervisor': 'Supervisor'
                        }
                        currentLevel = roleMap[(profile as any).rol] || (profile as any).rol
                        nombreActual = (profile as any).nombre || ''
                    }
                }

                const moduleAllowed = systemAdmin || PROCESOS_DISCIPLINARIOS_LEVELS.includes(currentLevel as any) || PROCESOS_DISCIPLINARIOS_EMAILS.includes(email)
                if (!moduleAllowed) {
                    setIsAuthorized(false)
                    return
                }

                const isAdmin = systemAdmin || (ADMIN_LEVELS as any).includes(currentLevel)
                const isAnalyst = ANALISTAS_CON_ACCESO.includes(email)
                const fullAccessEmails = ['hector.chinchilla@firplak.com', 'estiven.londono@firplak.com']

                if (isAdmin || isAnalyst || fullAccessEmails.includes(email)) {
                    setIsAuthorized(true)
                    return
                }

                // Can always see their own record
                if (empleado.correo_electronico === email) {
                    setIsAuthorized(true)
                    return
                }

                // Direct reports
                const nombreNorm = nombreActual.toLowerCase().trim()
                const jefeNorm = (empleado.jefe || '').toLowerCase().trim()
                if (nombreNorm && jefeNorm === nombreNorm) {
                    setIsAuthorized(true)
                    return
                }

                // Plant-wide access — never applies to Supervisors, who are restricted to
                // their own direct reports so they can't see other supervisors' teams.
                // Shared/generic multi-plant supervisor accounts (SUPERVISORES_MULTI_PLANTA)
                // are exempt, since their whole reason to exist is covering more than one plant.
                const isSupervisor = currentLevel.toLowerCase() === 'supervisor' && !SUPERVISORES_MULTI_PLANTA.includes(email)
                const plantas = getPlantasPermitidas(email)
                if (!isSupervisor && plantas && plantas.includes(empleado.planta)) {
                    setIsAuthorized(true)
                    return
                }

                setIsAuthorized(false)
            } catch (err) {
                console.error('Error checking authorization:', err)
                setIsAuthorized(false)
            }
        }
        checkAuthorization()
    }, [empleado, supabase])

    const handleEdit = (proceso: any) => {
        setEditingProceso(proceso)
        setIsCreateModalOpen(true)
    }

    const handleDelete = async (proceso: any) => {
        try {
            const { error } = await supabase
                .from('procesos_disciplinarios' as any)
                .delete()
                .eq('id', proceso.id)

            if (error) throw error

            toast.success('Registro eliminado correctamente')
            fetchData()
        } catch (err: any) {
            console.error('Error deleting proceso:', err)
            toast.error('No se pudo eliminar el registro')
        }
    }

    const handleCloseModal = () => {
        setIsCreateModalOpen(false)
        setEditingProceso(null)
    }

    if (!loading && isAuthorized === false) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-black text-[#1D3557] uppercase tracking-tighter mb-2">Acceso No Autorizado</h1>
                <p className="text-gray-500 text-center max-w-md mb-8">
                    No tienes permisos para ver el expediente disciplinario de este colaborador.
                </p>
                <Button onClick={() => router.push('/procesos-disciplinarios')} className="bg-[#1D3557] text-white rounded-xl px-8">
                    Volver al Listado
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F1F4F8] flex flex-col">
            {/* Standard AppBar */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 shadow-md text-white sticky top-0 z-50">
                <button
                    onClick={() => router.back()}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors mr-2"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 text-center font-medium text-lg">
                    Expediente Disciplinario
                </div>
                <Button
                    onClick={() => {
                        setEditingProceso(null)
                        setIsCreateModalOpen(true)
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white h-9 px-4 rounded-full font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 border border-white/20 shadow-none"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nuevo Registro</span>
                </Button>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {loading || isAuthorized === null ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-[#1D3557] animate-spin opacity-40" />
                        <p className="text-gray-400 font-medium text-sm animate-pulse">Abriendo expediente...</p>
                    </div>
                ) : (
                    <>
                        {/* Employee Card */}
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            {empleado && (
                                <EmpleadoCard empleado={{
                                    ...empleado,
                                    cedula: empleado.id
                                }} />
                            )}
                        </div>

                        {/* History Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#1D3557] h-8 w-1.5 rounded-full" />
                                    <h2 className="text-lg font-black text-[#1D3557] uppercase tracking-tight">Historial de Procesos</h2>
                                    <span className="bg-blue-100 text-[#1D3557] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {procesos.length}
                                    </span>
                                </div>
                            </div>

                            {procesos.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 pb-20">
                                    {procesos.map((proceso, index) => (
                                        <div
                                            key={proceso.id}
                                            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <ProcesoCard
                                                proceso={{
                                                    ...proceso,
                                                    created_at: proceso.created_at || proceso.createdAt,
                                                    created_by: proceso.created_by || proceso.createdBy
                                                }}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[32px] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 shadow-sm">
                                    <div className="bg-green-50 p-6 rounded-full mb-6 text-green-500">
                                        <ShieldCheck className="h-12 w-12" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1D3557] mb-1">Sin antecedentes</h3>
                                    <p className="text-gray-400 max-w-sm text-sm">
                                        No se han registrado procesos disciplinarios para este colaborador.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="mt-8 border-2 border-gray-100 hover:border-[#1D3557] text-gray-500 hover:text-[#1D3557] rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] px-8 h-12"
                                    >
                                        Crear primer registro
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {empleado && (
                <CrearProcesoModal
                    isOpen={isCreateModalOpen}
                    onClose={handleCloseModal}
                    empleadoId={empleado.id}
                    onSuccess={fetchData}
                    proceso={editingProceso}
                />
            )}
        </div>
    )
}
